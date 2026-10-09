#!/usr/bin/env python3
"""Build data/puzzles.json for "Melyik utca?" from OpenStreetMap (Overpass).

Standard library only. Raw Overpass answers are cached in .cache/ so the
network is hit once; pass --refresh to fetch again.

    python3 build_puzzles.py            # build (fetching only what is missing)
    python3 build_puzzles.py --refresh  # re-download everything
"""

import argparse
import hashlib
import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

SOUTH, WEST, NORTH, EAST = 46.49, 24.47, 46.60, 24.66
BBOX = f"{SOUTH},{WEST},{NORTH},{EAST}"

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
USER_AGENT = "melyikutca-build/1.0 (street-shape quiz; https://github.com/aloinarq/melyikutca)"

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, ".cache")
OUT_PATH = os.path.join(HERE, "data", "puzzles.json")

# Rózsák tere / Piața Trandafirilor, by the Cultural Palace: "the centre".
CENTER = (46.5440, 24.5592)

STREET_CLASSES = {
    "trunk": 0.0, "primary": 0.0, "secondary": 0.15, "tertiary": 0.35,
    "pedestrian": 0.35, "unclassified": 0.7, "living_street": 0.8, "residential": 0.8,
}

QUERIES = {
    "boundary": f"""
[out:json][timeout:120];
relation["boundary"="administrative"]["admin_level"="8"]["name"="Târgu Mureș"];
out geom;
""",
    "streets": f"""
[out:json][timeout:180][bbox:{BBOX}];
way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian)$"]["name"];
out tags geom;
""",
    "areas": f"""
[out:json][timeout:180][bbox:{BBOX}];
(
  way["place"="square"];
  relation["place"="square"];
  node["place"="square"];
  way["highway"="pedestrian"]["area"="yes"]["name"];
  relation["highway"="pedestrian"]["name"];
  way["building"]["name"];
  relation["building"]["name"];
  way["amenity"~"^(place_of_worship|theatre|school|college|university)$"]["name"];
  relation["amenity"~"^(place_of_worship|theatre|school|college|university)$"]["name"];
  way["historic"~"^(castle|citadel|fort|city_walls)$"];
  relation["historic"~"^(castle|citadel|fort|city_walls)$"];
  way["barrier"="city_wall"];
  way["leisure"="stadium"];
  relation["leisure"="stadium"];
  way["historic"]["name"];
  relation["historic"]["name"];
  way["name"~"[Cc]etat"];
  relation["name"~"[Cc]etat"];
);
out geom;
""",
    "places": f"""
[out:json][timeout:120][bbox:{BBOX}];
(
  node["place"~"^(suburb|neighbourhood|quarter|village|hamlet)$"]["name"];
  way["place"~"^(suburb|neighbourhood|quarter)$"]["name"];
  relation["place"~"^(suburb|neighbourhood|quarter)$"]["name"];
);
out tags center;
""",
    "apartments": f"""
[out:json][timeout:180][bbox:{BBOX}];
(
  way["building"="apartments"];
  relation["building"="apartments"];
);
out geom;
""",
    # How well known is a street? Bus lines along it, and businesses that give it as their address.
    "routes": f"""
[out:json][timeout:120][bbox:{BBOX}];
relation["route"~"^(bus|trolleybus|minibus)$"];
out body;
""",
    "addresses": f"""
[out:json][timeout:180][bbox:{BBOX}];
nwr["addr:street"];
out tags;
""",
    # Label-free background map, drawn by the game when no CARTO key is configured.
    "basemap": f"""
[out:json][timeout:240][bbox:{BBOX}];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|unclassified|residential|living_street|pedestrian)$"];
  way["highway"="service"]["service"!~"."];
  way["railway"="rail"]["service"!~"."];
  way["waterway"~"^(river|canal|stream)$"];
  way["natural"="water"];
  relation["natural"="water"];
  way["waterway"="riverbank"];
  way["leisure"~"^(park|garden)$"];
  relation["leisure"~"^(park|garden)$"];
  way["landuse"~"^(forest|cemetery|recreation_ground)$"];
  relation["landuse"~"^(forest|cemetery)$"];
  way["natural"="wood"];
  relation["natural"="wood"];
);
out geom;
""",
}


# --------------------------------------------------------------------------
# Fetching

def overpass(name, query, refresh=False):
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.sha1(query.encode()).hexdigest()[:10]
    path = os.path.join(CACHE_DIR, f"{name}-{key}.json")
    if os.path.exists(path) and not refresh:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    body = urllib.parse.urlencode({"data": query}).encode()
    last = None
    # Public mirrors are flaky (frequent HTTP 500s), so retry patiently.
    for attempt in range(40):
        for url in ENDPOINTS:
            req = urllib.request.Request(url, data=body, headers={
                "User-Agent": USER_AGENT,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            })
            try:
                print(f"  [{name}] POST {url} (attempt {attempt + 1})", file=sys.stderr)
                with urllib.request.urlopen(req, timeout=240) as resp:
                    raw = resp.read()
                data = json.loads(raw)
                if "elements" not in data:
                    raise ValueError("no 'elements' in answer")
                if data.get("remark") and "error" in data["remark"].lower():
                    raise ValueError(data["remark"])
                with open(path, "wb") as f:
                    f.write(raw)
                print(f"  [{name}] {len(data['elements'])} elements", file=sys.stderr)
                return data
            except (urllib.error.URLError, OSError, ValueError) as e:
                last = e
                print(f"  [{name}]   failed: {e}", file=sys.stderr)
        wait = min(30, 3 + 2 * attempt)
        print(f"  [{name}] all endpoints failed, retrying in {wait}s", file=sys.stderr)
        time.sleep(wait)
    raise SystemExit(f"Overpass query '{name}' failed: {last}")


# --------------------------------------------------------------------------
# Geometry helpers (local metric plane around the city centre)

LAT0 = CENTER[0]
MX = 111320.0 * math.cos(math.radians(LAT0))
MY = 110540.0


def to_xy(lat, lon):
    return ((lon - CENTER[1]) * MX, (lat - CENTER[0]) * MY)


def to_ll(x, y):
    return (CENTER[0] + y / MY, CENTER[1] + x / MX)


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def seg_dist(p, a, b):
    ax, ay = a
    dx, dy = b[0] - ax, b[1] - ay
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2))
    return math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy)


def polyline_len(pts):
    return sum(dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def ring_area(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return s / 2.0


def ring_centroid(ring):
    a = ring_area(ring)
    if abs(a) < 1e-9:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return (sum(xs) / len(xs), sum(ys) / len(ys))
    cx = cy = 0.0
    for i in range(len(ring) - 1):
        f = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
        cx += (ring[i][0] + ring[i + 1][0]) * f
        cy += (ring[i][1] + ring[i + 1][1]) * f
    return (cx / (6 * a), cy / (6 * a))


def point_in_ring(p, ring):
    x, y = p
    inside = False
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def convex_hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def min_rect_area(pts):
    """Area of the minimum-area bounding rectangle (rotating calipers on the hull)."""
    hull = convex_hull(pts)
    if len(hull) < 3:
        return 0.0
    best = float("inf")
    for i in range(len(hull)):
        a, b = hull[i], hull[(i + 1) % len(hull)]
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        c, s = math.cos(-ang), math.sin(-ang)
        xs = [p[0] * c - p[1] * s for p in hull]
        ys = [p[0] * s + p[1] * c for p in hull]
        best = min(best, (max(xs) - min(xs)) * (max(ys) - min(ys)))
    return best


def simplify(pts, tol):
    """Douglas-Peucker."""
    if len(pts) < 3:
        return pts[:]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        best, idx = 0.0, -1
        for k in range(i + 1, j):
            d = seg_dist(pts[k], pts[i], pts[j])
            if d > best:
                best, idx = d, k
        if best > tol and idx > 0:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [p for p, k in zip(pts, keep) if k]


def stitch(lines, closed_only=False):
    """Join polylines that share endpoints. Returns a list of polylines."""
    def key(p):
        return (round(p[0], 1), round(p[1], 1))

    pool = [list(l) for l in lines if len(l) >= 2]
    out = []
    while pool:
        cur = pool.pop()
        changed = True
        while changed and key(cur[0]) != key(cur[-1]):
            changed = False
            for i, l in enumerate(pool):
                if key(l[0]) == key(cur[-1]):
                    cur += l[1:]
                elif key(l[-1]) == key(cur[-1]):
                    cur += l[::-1][1:]
                elif key(l[-1]) == key(cur[0]):
                    cur = l[:-1] + cur
                elif key(l[0]) == key(cur[0]):
                    cur = l[::-1][:-1] + cur
                else:
                    continue
                pool.pop(i)
                changed = True
                break
        if closed_only and key(cur[0]) != key(cur[-1]):
            continue
        out.append(cur)
    return out


def element_rings(el):
    """Outer rings (closed, metric) of a way/relation from `out geom`."""
    if el["type"] == "way":
        g = el.get("geometry") or []
        pts = [to_xy(n["lat"], n["lon"]) for n in g if n]
        if len(pts) >= 4 and dist(pts[0], pts[-1]) < 0.5:
            return [pts]
        return []
    if el["type"] == "relation":
        outers = []
        for m in el.get("members", []):
            if m.get("type") == "way" and m.get("role", "outer") in ("outer", "") and m.get("geometry"):
                outers.append([to_xy(n["lat"], n["lon"]) for n in m["geometry"] if n])
        return [r for r in stitch(outers, closed_only=True) if len(r) >= 4]
    return []


def element_lines(el):
    if el["type"] == "way":
        g = el.get("geometry") or []
        return [[to_xy(n["lat"], n["lon"]) for n in g if n]]
    lines = []
    for m in el.get("members", []):
        if m.get("type") == "way" and m.get("geometry"):
            lines.append([to_xy(n["lat"], n["lon"]) for n in m["geometry"] if n])
    return lines


def shape_dist(p, parts, closed):
    """Distance from point p to a shape (0 inside polygons)."""
    best = float("inf")
    for part in parts:
        if closed and point_in_ring(p, part):
            return 0.0
        for i in range(len(part) - 1):
            best = min(best, seg_dist(p, part[i], part[i + 1]))
    return best


# --------------------------------------------------------------------------
# Naming

def names(tags):
    ro = tags.get("name:ro") or tags.get("name") or ""
    hu = tags.get("name:hu") or ""
    return hu, ro


def most_common(values):
    values = [v for v in values if v]
    return Counter(values).most_common(1)[0][0] if values else ""


def hu_article(word):
    """Hungarian definite article: "az" before a vowel sound, "a" otherwise."""
    first = word[:1].lower()
    return "az" if first in "aáeéiíoóöőuúüű" or first in "15" else "a"


def clamp01(v):
    return max(0.0, min(1.0, v))


# --------------------------------------------------------------------------
# Puzzle builders

def straightness(parts):
    """Max deviation (m) of all vertices from the principal axis, and the span along it."""
    pts = [p for part in parts for p in part]
    n = len(pts)
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts)
    syy = sum((p[1] - my) ** 2 for p in pts)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts)
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(ang), math.sin(ang)
    along = [(p[0] - mx) * ux + (p[1] - my) * uy for p in pts]
    across = [-(p[0] - mx) * uy + (p[1] - my) * ux for p in pts]
    return max(across) - min(across), max(along) - min(along)


def build_streets(streets_raw, in_city):
    by_name = defaultdict(list)
    for el in streets_raw["elements"]:
        if el["type"] != "way" or el.get("tags", {}).get("area") == "yes":
            continue
        name = el["tags"].get("name")
        line = element_lines(el)[0]
        if len(line) >= 2:
            by_name[name].append((el, line))

    puzzles, all_named = [], []
    rejected = Counter()
    for name, items in by_name.items():
        # Connected components among same-named ways (endpoints / vertices within 40 m).
        n = len(items)
        parent = list(range(n))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        boxes = []
        for _, line in items:
            xs = [p[0] for p in line]
            ys = [p[1] for p in line]
            boxes.append((min(xs), min(ys), max(xs), max(ys)))
        for i in range(n):
            for j in range(i + 1, n):
                bi, bj = boxes[i], boxes[j]
                if bi[0] - 40 > bj[2] or bj[0] - 40 > bi[2] or bi[1] - 40 > bj[3] or bj[1] - 40 > bi[3]:
                    continue
                li, lj = items[i][1], items[j][1]
                close = any(
                    min(seg_dist(p, lj[k], lj[k + 1]) for k in range(len(lj) - 1)) < 40
                    for p in (li[0], li[-1])
                ) or any(
                    min(seg_dist(p, li[k], li[k + 1]) for k in range(len(li) - 1)) < 40
                    for p in (lj[0], lj[-1])
                )
                if close:
                    parent[find(i)] = find(j)
        groups = defaultdict(list)
        for i in range(n):
            groups[find(i)].append(items[i])

        for gi, group in enumerate(sorted(groups.values(), key=lambda g: -sum(polyline_len(l) for _, l in g))):
            lines = stitch([l for _, l in group])
            length = sum(polyline_len(l) for l in lines)
            tags_list = [el["tags"] for el, _ in group]
            hu = most_common([t.get("name:hu") for t in tags_list])
            ro = most_common([t.get("name:ro") or t.get("name") for t in tags_list])
            classes = [el["tags"]["highway"] for el, _ in group]
            # Length-weighted best road class.
            cls = min(classes, key=lambda c: STREET_CLASSES.get(c, 1))
            all_named.append({"lines": lines, "hu": hu, "ro": ro})
            if length < 120:
                rejected["street: shorter than 120 m"] += 1
                continue
            # Only streets with a recognisable outline are used for shape-only rounds;
            # the name and multiple-choice rounds take any street.
            dev, span = straightness(lines)
            # Long roads need proportionally more bend: a 2 km line with a 30 m hook is still a line.
            shape_ok = length >= 150 and dev >= max(25, 0.06 * span)
            cx, cy = centroid_of_lines(lines)
            if not in_city((cx, cy)):
                rejected["street: outside the city"] += 1
                continue
            is_square = ro.lower().startswith("piața") or hu.lower().endswith(" tér") or hu.lower().endswith(" tere")
            puzzles.append({
                "type": "square" if is_square else "street",
                "kind": "line",
                "parts": lines,
                "hu": hu, "ro": ro,
                "length": length,
                "fame": STREET_CLASSES.get(cls, 0.8) * (0.6 if is_square else 1.0),
                "osm": sorted({f"w{el['id']}" for el, _ in group}),
                "key": f"{name}#{gi}",
                "cls": cls,
                "shape_ok": shape_ok,
                "name_tag": name,
            })
    return puzzles, all_named, rejected


def group_lines(lines, gap):
    """Connected groups of polylines whose vertices come within `gap` metres."""
    n = len(lines)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            if min(dist(a, b) for a in lines[i] for b in lines[j]) < gap:
                parent[find(i)] = find(j)
    groups = defaultdict(list)
    for i in range(n):
        groups[find(i)].append(lines[i])
    return list(groups.values())


def centroid_of_lines(lines):
    sx = sy = tot = 0.0
    for l in lines:
        for i in range(len(l) - 1):
            d = dist(l[i], l[i + 1])
            sx += (l[i][0] + l[i + 1][0]) / 2 * d
            sy += (l[i][1] + l[i + 1][1]) / 2 * d
            tot += d
    if tot == 0:
        pts = [p for l in lines for p in l]
        return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    return (sx / tot, sy / tot)


# Name fragments of buildings every local knows.
FAMOUS = [
    "palatul culturii", "kultúrpalota", "cetatea medieval", "vártemplom", "teatrul național",
    "nemzeti színház", "prefectur", "primăria târgu", "városháza", "catedrala", "sinagoga mare",
    "zsinagóga", "teleki", "bolyai", "apollo", "apolló", "palatul copiilor", "stadion",
    "sala sporturilor", "hotel continental", "concordia", "mureș mall", "papiu", "unirea",
    "filarmonic", "filharmón", "palatul", "palota", "toldalagi", "bürger",
]
NOT_FAMOUS = ["cetatea copiilor"]  # a playground, not the citadel
# The old churches whose towers everyone knows; newer congregations rarely are.
HISTORIC_DENOMINATIONS = {
    "catholic", "roman_catholic", "greek_catholic", "orthodox", "romanian_orthodox",
    "reformed", "unitarian", "lutheran", "evangelical",
}
# Categories that make a named building a reasonable landmark. Offices and
# "public buildings" are left out: nobody knows the shape of the records office.
LANDMARK_AMENITY = {
    "place_of_worship", "theatre", "townhall", "school", "college", "university",
    "hospital", "library", "arts_centre", "cinema", "courthouse", "community_centre", "concert_hall",
}
LANDMARK_BUILDING = {
    "church", "cathedral", "chapel", "synagogue", "school",
    "university", "college", "hospital", "train_station", "stadium", "palace", "castle", "hotel",
    "sports_hall", "museum", "transportation",
}


def landmark_kind(tags, low, area, from_center):
    """(is_landmark, fame) — fame 0 = everybody knows it, 1 = obscure.

    Footprints are hard to recognise, so only buildings most locals could place
    get in: the famous ones, and big churches in the centre whose towers people know.
    """
    church = (tags.get("amenity") == "place_of_worship"
              or tags.get("building") in ("church", "cathedral", "chapel", "synagogue"))
    famous = any(k in low for k in FAMOUS) and not any(k in low for k in NOT_FAMOUS)
    if tags.get("historic") in ("castle", "citadel", "fort") or tags.get("leisure") == "stadium":
        return True, 0.0
    if famous:
        return True, 0.05 if church or tags.get("amenity") in ("theatre", "townhall") else 0.15
    if (church and area >= 450 and from_center < 1300
            and tags.get("denomination") in HISTORIC_DENOMINATIONS):
        return True, 0.3
    return False, 1.0


def landmark_category(tags, low):
    """What the round's label says about a landmark (Templom, Színház, …)."""
    if tags.get("historic") in ("castle", "citadel", "fort") or tags.get("barrier") == "city_wall":
        return "fortress"
    if tags.get("leisure") in ("stadium", "sports_centre") or "sala sporturilor" in low:
        return "sport"
    if tags.get("building") == "synagogue" or "sinagog" in low:
        return "synagogue"
    if tags.get("amenity") == "place_of_worship" or tags.get("building") in ("church", "cathedral", "chapel"):
        return "church"
    if "palatul" in low or "palota" in low:
        return "palace"
    if tags.get("amenity") == "theatre":
        return "theatre"
    if tags.get("amenity") == "townhall" or "primări" in low:
        return "townhall"
    if tags.get("tourism") == "hotel" or "hotel" in low:
        return "hotel"
    if tags.get("amenity") == "library" or "biblioteca" in low:
        return "library"
    if tags.get("shop") == "mall" or " mall" in low:
        return "mall"
    if tags.get("amenity") == "university" or tags.get("building") == "university" or "universit" in low:
        return "university"
    if tags.get("amenity") in ("school", "college") or tags.get("building") == "school":
        return "school"
    return "building"


def build_areas(areas_raw, in_city):
    squares, landmarks, walls = [], [], []
    rejected = Counter()
    for el in areas_raw["elements"]:
        tags = el.get("tags", {})
        if el["type"] == "node":
            continue
        hu, ro = names(tags)
        name = ro or hu
        is_square = tags.get("place") == "square" or (tags.get("highway") == "pedestrian" and name)
        is_wall = tags.get("barrier") == "city_wall" or tags.get("historic") in ("city_walls",)
        rings = element_rings(el)
        if is_wall and not rings:
            # The citadel walls are mapped as many short unnamed ways; gather them.
            walls.append(el)
            continue
        if not rings or not name:
            if name:
                rejected["area: no closed outline"] += 1
            continue
        area = sum(abs(ring_area(r)) for r in rings)
        big = max(rings, key=lambda r: abs(ring_area(r)))
        c = ring_centroid(big)
        if not in_city(c):
            rejected["area: outside the city"] += 1
            continue
        perim = sum(polyline_len(r) for r in rings)
        base = {
            "kind": "area", "parts": rings, "hu": hu, "ro": ro, "area": area,
            "length": perim, "osm": [f"{el['type'][0]}{el['id']}"],
            "key": f"{name}:{el['type']}{el['id']}", "tags": tags,
        }
        if is_square:
            if area < 400:
                rejected["square: smaller than 400 m²"] += 1
                continue
            squares.append({**base, "type": "square", "fame": 0.25})
            continue

        # Landmarks: named buildings people know, with outlines worth looking at.
        low = (name + " " + hu).lower()
        ok, fame = landmark_kind(tags, low, area, dist(c, (0, 0)))
        if not ok:
            rejected["landmark: not well known"] += 1
            continue
        fortress = tags.get("historic") in ("castle", "citadel", "fort")
        stadium = tags.get("leisure") == "stadium"
        if not tags.get("building") and not (fortress or stadium or tags.get("amenity") == "place_of_worship"):
            # School/university grounds are not footprints.
            rejected["landmark: grounds, not a building"] += 1
            continue
        if area < (150 if fame < 0.3 else 300):
            rejected["landmark: too small"] += 1
            continue
        landmarks.append({**base, "type": "landmark", "fame": fame, "cat": landmark_category(tags, low)})

    # City walls: one landmark per connected group long enough to be recognisable.
    wall_lines = [l for el in walls for l in element_lines(el) if len(l) >= 2]
    for gi, group in enumerate(group_lines(wall_lines, 60)):
        length = sum(polyline_len(l) for l in group)
        c = centroid_of_lines(group)
        if length < 300 or not in_city(c):
            continue
        landmarks.append({
            "type": "landmark", "kind": "line", "parts": stitch(group),
            "hu": "A vár falai", "ro": "Zidurile Cetății", "area": 0, "length": length,
            "fame": 0.0, "osm": [], "key": f"WALL:{gi}", "tags": {"barrier": "city_wall"}, "cat": "fortress",
        })

    # Deduplicate: same name within 200 m -> keep the one with a building tag / larger area.
    def dedup(items):
        items.sort(key=lambda p: (0 if p.get("tags", {}).get("building") else 1, -p["area"]))
        kept = []
        for p in items:
            pc = shape_centroid(p)
            nm = (p["ro"] or p["hu"]).lower()
            dupe = False
            for q in kept:
                if (q["ro"] or q["hu"]).lower() == nm and dist(pc, shape_centroid(q)) < 200:
                    dupe = True
                    break
                # Same spot, different tag (church grounds vs church building).
                if dist(pc, shape_centroid(q)) < 25:
                    dupe = True
                    break
            if dupe:
                rejected["duplicate outline"] += 1
                continue
            kept.append(p)
        return kept

    return dedup(squares), dedup(landmarks), rejected


def shape_centroid(p):
    if p["kind"] == "area":
        big = max(p["parts"], key=lambda r: abs(ring_area(r)))
        return ring_centroid(big)
    return centroid_of_lines(p["parts"])


def build_clusters(apts_raw, in_city, max_blocks=18):
    blocks = []
    for el in apts_raw["elements"]:
        for r in element_rings(el):
            a = abs(ring_area(r))
            if a < 60:
                continue
            xs = [p[0] for p in r]
            ys = [p[1] for p in r]
            blocks.append({"ring": r, "area": a, "c": ring_centroid(r),
                           "box": (min(xs), min(ys), max(xs), max(ys))})
    n = len(blocks)

    def poly_dist(a, b):
        ba, bb = a["box"], b["box"]
        gap = max(ba[0] - bb[2], bb[0] - ba[2], ba[1] - bb[3], bb[1] - ba[3], 0)
        if gap > 80:
            return gap
        ra, rb = a["ring"], b["ring"]
        d = min(min(seg_dist(p, rb[k], rb[k + 1]) for k in range(len(rb) - 1)) for p in ra)
        d = min(d, min(min(seg_dist(p, ra[k], ra[k + 1]) for k in range(len(ra) - 1)) for p in rb))
        return d

    # Neighbour lists with distances, using a coarse grid.
    grid = defaultdict(list)
    for i, b in enumerate(blocks):
        grid[(int(b["c"][0] // 200), int(b["c"][1] // 200))].append(i)
    pairs = []
    for i, b in enumerate(blocks):
        gx, gy = int(b["c"][0] // 200), int(b["c"][1] // 200)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in grid[(gx + dx, gy + dy)]:
                    if j > i:
                        d = poly_dist(b, blocks[j])
                        if d <= 80:
                            pairs.append((d, i, j))

    def components(idx, thr):
        parent = {i: i for i in idx}

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        s = set(idx)
        for d, i, j in pairs:
            if d <= thr and i in s and j in s:
                parent[find(i)] = find(j)
        groups = defaultdict(list)
        for i in idx:
            groups[find(i)].append(i)
        return list(groups.values())

    def kmeans_split(idx):
        k = math.ceil(len(idx) / max_blocks)
        pts = [blocks[i]["c"] for i in idx]
        # Deterministic farthest-point init.
        cents = [pts[0]]
        while len(cents) < k:
            cents.append(max(pts, key=lambda p: min(dist(p, c) for c in cents)))
        for _ in range(25):
            assign = [min(range(k), key=lambda c: dist(p, cents[c])) for p in pts]
            for c in range(k):
                mem = [pts[t] for t in range(len(pts)) if assign[t] == c]
                if mem:
                    cents[c] = (sum(p[0] for p in mem) / len(mem), sum(p[1] for p in mem) / len(mem))
        out = defaultdict(list)
        for t, c in enumerate(assign):
            out[c].append(idx[t])
        return list(out.values())

    final = []

    def split(idx, thresholds):
        if len(idx) <= max_blocks:
            final.append(idx)
            return
        if not thresholds:
            for part in kmeans_split(idx):
                final.append(part)
            return
        for comp in components(idx, thresholds[0]):
            split(comp, thresholds[1:])

    for comp in components(list(range(n)), 80):
        if len(comp) >= 4:
            split(comp, [50, 35, 25])

    clusters = []
    for idx in final:
        if len(idx) < 4:
            continue
        rings = [blocks[i]["ring"] for i in idx]
        area = sum(blocks[i]["area"] for i in idx)
        c = (sum(blocks[i]["c"][0] * blocks[i]["area"] for i in idx) / area,
             sum(blocks[i]["c"][1] * blocks[i]["area"] for i in idx) / area)
        if not in_city(c):
            continue
        clusters.append({
            "type": "blocks", "kind": "area", "parts": rings, "area": area,
            "length": 0, "fame": 1.0, "count": len(idx), "c": c, "hu": "", "ro": "",
            "osm": [], "key": f"B:{round(c[0])}:{round(c[1])}",
        })
    return clusters, len(blocks)


# --------------------------------------------------------------------------
# Background map (used when no CARTO key is set)

BASEMAP_PATH = os.path.join(HERE, "data", "basemap.json")
MAJOR = {"motorway", "trunk", "primary", "secondary", "tertiary", "motorway_link", "trunk_link",
         "primary_link", "secondary_link", "tertiary_link"}


def encode_line(pts_xy):
    """Metric polyline -> flat delta-encoded ints in 1e-5 degrees from the SW corner."""
    out, plat, plon = [], 0, 0
    for x, y in pts_xy:
        lat, lon = to_ll(x, y)
        ilat, ilon = round((lat - SOUTH) * 1e5), round((lon - WEST) * 1e5)
        if out and ilat == plat and ilon == plon:
            continue
        out += [ilat - plat, ilon - plon]
        plat, plon = ilat, ilon
    return out


def road_lines(raw):
    """Metric polylines (with bounding boxes) of every drivable/pedestrian road."""
    out = []
    for el in raw["elements"]:
        t = el.get("tags", {})
        hw = t.get("highway")
        if not hw or hw == "service" or t.get("area") == "yes" or el["type"] != "way":
            continue
        for line in element_lines(el):
            if len(line) < 2:
                continue
            xs = [p[0] for p in line]
            ys = [p[1] for p in line]
            out.append((line, (min(xs), min(ys), max(xs), max(ys))))
    return out


def clip_segment(a, b, box):
    """Liang–Barsky: the part of segment a-b inside box, or None."""
    x0, y0, x1, y1 = box
    dx, dy = b[0] - a[0], b[1] - a[1]
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, a[0] - x0), (dx, x1 - a[0]), (-dy, a[1] - y0), (dy, y1 - a[1])):
        if p == 0:
            if q < 0:
                return None
            continue
        r = q / p
        if p < 0:
            t0 = max(t0, r)
        else:
            t1 = min(t1, r)
        if t0 > t1:
            return None
    return (a[0] + t0 * dx, a[1] + t0 * dy), (a[0] + t1 * dx, a[1] + t1 * dy)


def context_streets(parts, roads, min_frame=280, grow=0.35):
    """The streets around a building or block cluster, cropped to a frame around it.

    Returns (polylines, frame) in metric coordinates. The frame is at least
    `min_frame` metres across so there is always some street pattern to recognise,
    and leaves `grow` × the shape's size of margin on each side.
    """
    xs = [p[0] for part in parts for p in part]
    ys = [p[1] for part in parts for p in part]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    mx = max(40, grow * w, (min_frame - w) / 2)
    my = max(40, grow * h, (min_frame - h) / 2)
    frame = (min(xs) - mx, min(ys) - my, max(xs) + mx, max(ys) + my)
    # Streets are kept well beyond the frame so a wide or tall sheet is filled to its edges.
    pad = 0.6 * max(frame[2] - frame[0], frame[3] - frame[1])
    box = (frame[0] - pad, frame[1] - pad, frame[2] + pad, frame[3] + pad)
    out = []
    for line, lb in roads:
        if lb[0] > box[2] or lb[2] < box[0] or lb[1] > box[3] or lb[3] < box[1]:
            continue
        cur = []
        for i in range(len(line) - 1):
            seg = clip_segment(line[i], line[i + 1], box)
            if seg is None:
                if len(cur) >= 2:
                    out.append(cur)
                cur = []
                continue
            if cur and dist(cur[-1], seg[0]) < 0.01:
                cur.append(seg[1])
            else:
                if len(cur) >= 2:
                    out.append(cur)
                cur = [seg[0], seg[1]]
        if len(cur) >= 2:
            out.append(cur)
    return [simplify(l, 1.5) for l in out if polyline_len(l) > 5], frame


def build_basemap(raw):
    layers = defaultdict(list)
    for el in raw["elements"]:
        t = el.get("tags", {})
        hw, ww = t.get("highway"), t.get("waterway")
        if t.get("natural") == "water" or ww == "riverbank":
            cls, area = "water", True
        elif (t.get("leisure") in ("park", "garden") or t.get("natural") == "wood"
              or t.get("landuse") in ("forest", "cemetery", "recreation_ground")):
            cls, area = "green", True
        elif hw:
            if t.get("area") == "yes":
                continue
            cls, area = ("major" if hw in MAJOR else "service" if hw == "service" else "minor"), False
        elif t.get("railway") == "rail":
            cls, area = "rail", False
        elif ww in ("river", "canal"):
            cls, area = "river", False
        elif ww == "stream":
            cls, area = "stream", False
        else:
            continue
        geoms = element_rings(el) if area else element_lines(el)
        for g in geoms:
            if len(g) < 2:
                continue
            if area and abs(ring_area(g)) < 1500:
                continue
            tol = 2.0 if cls in ("major", "minor", "service") else 4.0
            enc = encode_line(simplify(g, tol))
            if len(enc) >= 4:
                layers[cls].append(enc)
    return {"origin": [SOUTH, WEST], "unit": 1e-5, "layers": layers}


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="ignore the cache and re-download")
    args = ap.parse_args()

    print("Fetching OpenStreetMap data (cached in .cache/)…", file=sys.stderr)
    raw = {k: overpass(k, q, args.refresh) for k, q in QUERIES.items()}

    # City limits: puzzles must lie inside the municipality.
    city_rings = []
    for el in raw["boundary"]["elements"]:
        city_rings += element_rings(el)
    if city_rings:
        def in_city(p):
            return any(point_in_ring(p, r) for r in city_rings)
    else:
        print("  warning: no city boundary found, using the whole bounding box", file=sys.stderr)

        def in_city(p):
            return True

    # Neighbourhoods for hints.
    places = []
    for el in raw["places"]["elements"]:
        t = el.get("tags", {})
        ll = (el["lat"], el["lon"]) if el["type"] == "node" else (el["center"]["lat"], el["center"]["lon"])
        hu, ro = names(t)
        places.append({"xy": to_xy(*ll), "hu": hu or ro, "ro": ro or hu, "place": t.get("place")})
    city_places = [p for p in places if p["place"] in ("suburb", "neighbourhood", "quarter") and in_city(p["xy"])]

    def neighbourhood(c):
        best = min(city_places, key=lambda p: dist(p["xy"], c)) if city_places else None
        if best is None or dist(best["xy"], c) > 2500:
            return {"hu": "", "ro": ""}
        return {"hu": best["hu"], "ro": best["ro"]}

    streets, all_named, rej_s = build_streets(raw["streets"], in_city)
    squares, landmarks, rej_a = build_areas(raw["areas"], in_city)
    clusters, n_blocks = build_clusters(raw["apartments"], in_city)

    # Drop line-squares that duplicate an area-square of the same name.
    sq_names = {(p["ro"] or p["hu"]).lower() for p in squares}
    streets = [p for p in streets if not (p["type"] == "square" and (p["ro"] or p["hu"]).lower() in sq_names)]

    # Label block clusters by the nearest named street.
    for cl in clusters:
        c = cl["c"]
        best, bd = None, float("inf")
        for s in all_named:
            for l in s["lines"]:
                for i in range(len(l) - 1):
                    d = seg_dist(c, l[i], l[i + 1])
                    if d < bd:
                        bd, best = d, s
        nb = neighbourhood(c)
        if best and bd < 250:
            cl["hu"] = f"Tömbházak {hu_article(best['hu'])} {best['hu']} mentén" if best["hu"] else f"Tömbházak · {best['ro']}"
            cl["ro"] = f"Blocuri pe {best['ro']}"
            cl["street"] = {"hu": best["hu"], "ro": best["ro"]}
        else:
            cl["hu"] = f"Tömbházak – {nb['hu']}" if nb["hu"] else "Tömbházcsoport"
            cl["ro"] = f"Blocuri – {nb['ro']}" if nb["ro"] else "Grup de blocuri"

    candidates = streets + squares + landmarks + clusters
    roads = road_lines(raw["basemap"])

    # How well known is each place? 0 = nobody, 1 = everybody. Difficulty comes from
    # this rank, not from the shape: an obscure street is hard however it looks.
    bus_ways = {m["ref"] for el in raw["routes"]["elements"] for m in el.get("members", [])
                if m.get("type") == "way"}
    poi_keys = ("shop", "amenity", "office", "craft", "tourism", "healthcare")
    pois, addrs = Counter(), Counter()
    for el in raw["addresses"]["elements"]:
        t = el.get("tags", {})
        st = t.get("addr:street")
        addrs[st] += 1
        if any(k in t for k in poi_keys):
            pois[st] += 1
    road_class = {"trunk": 1.0, "primary": 1.0, "secondary": 0.85, "tertiary": 0.65, "pedestrian": 0.7,
                  "unclassified": 0.3, "living_street": 0.25, "residential": 0.2}
    for p in candidates:
        c = p.get("c") or shape_centroid(p)
        p["c"] = c
        central = 1 - clamp01((dist(c, (0, 0)) - 300) / 2700)
        if p["type"] in ("street", "square"):
            nm = p.get("name_tag") or p["ro"]
            bus = 1.0 if any(int(w[1:]) in bus_ways for w in p["osm"] if w.startswith("w")) else 0.0
            poi = clamp01(math.log1p(pois[nm]) / math.log1p(40))
            addr = clamp01(math.log1p(addrs[nm]) / math.log1p(150))
            length = clamp01(math.log(max(p["length"], 120) / 120) / math.log(3000 / 120))
            known = (0.25 * road_class.get(p.get("cls"), 0.2) + 0.12 * length + 0.28 * central
                     + 0.10 * bus + 0.18 * poi + 0.07 * addr)
            if p["type"] == "square":
                known = max(known, 0.55 + 0.35 * central)  # squares are landmarks in their own right
            p["bus"], p["pois"] = bool(bus), pois[nm]
        elif p["type"] == "landmark":
            known = 1.0 - 0.5 * p["fame"]  # fame 0 = everybody knows it
        else:
            known = 0.15  # block clusters: only for shape rounds
        p["known"] = known
    # Tiers: streets by rank (the 40 best known are easy, the next 120 medium);
    # the squares and landmarks that made it this far are all well known.
    ranked = sorted((p for p in candidates if p["type"] == "street"), key=lambda p: -p["known"])
    for i, p in enumerate(ranked):
        p["tier"] = "easy" if i < 40 else ("medium" if i < 160 else "hard")
    for p in candidates:
        if p["type"] in ("square", "landmark"):
            p["tier"] = "easy"
        elif p["type"] == "blocks":
            p["tier"] = "hard"

    puzzles = []
    type_prefix = {"street": "s", "square": "q", "landmark": "l", "blocks": "b"}
    seen_ids = set()
    for p in candidates:
        tier = p["tier"]
        # Simplify for drawing: tolerance relative to the shape's size.
        xs = [pt[0] for part in p["parts"] for pt in part]
        ys = [pt[1] for part in p["parts"] for pt in part]
        extent = max(max(xs) - min(xs), max(ys) - min(ys))
        tol = max(0.8, extent / 350)
        parts = []
        for part in p["parts"]:
            s = simplify(part, tol)
            if p["kind"] == "area" and len(s) < 4:
                s = part
            parts.append([[round(ll, 5) for ll in to_ll(*pt)[::1]] for pt in s])
        lat_c, lon_c = to_ll(*p["c"])
        ident = type_prefix[p["type"]] + hashlib.sha1(p["key"].encode()).hexdigest()[:8]
        if ident in seen_ids:
            continue
        seen_ids.add(ident)
        lats = [pt[0] for part in parts for pt in part]
        lons = [pt[1] for part in parts for pt in part]
        nb = neighbourhood(p["c"])
        item = {
            "id": ident,
            "type": p["type"],
            "kind": p["kind"],
            "name": {"hu": p["hu"] or p["ro"], "ro": p["ro"] or p["hu"]},
            "hood": nb,
            "difficulty": tier,
            "known": round(100 * p["known"]),
            # Fit for a shape-only round: a distinctive outline of something well known.
            "shape": bool(p.get("shape_ok", True)),
            "centroid": [round(lat_c, 5), round(lon_c, 5)],
            "bbox": [min(lats), min(lons), max(lats), max(lons)],
            "size": round(p["length"]) if p["kind"] == "line" else round(p["area"]),
            "geom": parts,
        }
        if p["type"] in ("landmark", "blocks"):
            # Buildings get a tighter frame than block clusters so the footprint stays legible.
            frame = (170, 1.0) if p["type"] == "landmark" else (280, 0.35)
            ctx, (bx0, by0, bx1, by1) = context_streets(p["parts"], roads, *frame)
            # Same compact encoding as basemap.json: delta ints in 1e-5° from the SW corner.
            item["ctx"] = [enc for enc in (encode_line(l) for l in ctx) if len(enc) >= 4]
            (s0, w0), (n0, e0) = to_ll(bx0, by0), to_ll(bx1, by1)
            item["cbox"] = [round(s0, 5), round(w0, 5), round(n0, 5), round(e0, 5)]
        if p.get("cat"):
            item["cat"] = p["cat"]
        if p["type"] == "blocks":
            item["count"] = p["count"]
            if p.get("street"):
                item["street"] = p["street"]
        puzzles.append(item)

    puzzles.sort(key=lambda p: p["id"])
    bounds = [SOUTH, WEST, NORTH, EAST]
    out = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "osm_timestamp": raw["streets"].get("osm3s", {}).get("timestamp_osm_base", ""),
        "attribution": "© OpenStreetMap contributors (ODbL)",
        "bounds": bounds,
        "ctx_origin": [SOUTH, WEST],
        "ctx_unit": 1e-5,
        "center": list(CENTER),
        "puzzles": puzzles,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    basemap = build_basemap(raw["basemap"])
    basemap["attribution"] = out["attribution"]
    with open(BASEMAP_PATH, "w", encoding="utf-8") as f:
        json.dump(basemap, f, separators=(",", ":"))

    # ---- Summary
    print()
    print(f"Wrote {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1024:.0f} KB), "
          f"OSM data as of {out['osm_timestamp']}")
    print(f"Wrote {BASEMAP_PATH} ({os.path.getsize(BASEMAP_PATH) / 1024:.0f} KB): "
          + ", ".join(f"{k} {len(v)}" for k, v in sorted(basemap["layers"].items())))
    print(f"City boundary rings: {len(city_rings)}, apartment buildings: {n_blocks}, "
          f"neighbourhood places: {len(city_places)}")
    types = ["street", "square", "landmark", "blocks"]
    tiers = ["easy", "medium", "hard"]
    table = Counter((p["type"], p["difficulty"]) for p in puzzles)
    print()
    print(f"{'type':<10}" + "".join(f"{t:>8}" for t in tiers) + f"{'total':>8}")
    for ty in types:
        print(f"{ty:<10}" + "".join(f"{table[(ty, t)]:>8}" for t in tiers)
              + f"{sum(table[(ty, t)] for t in tiers):>8}")
    print(f"{'total':<10}" + "".join(f"{sum(table[(ty, t)] for ty in types):>8}" for t in tiers)
          + f"{len(puzzles):>8}")
    shape_tbl = Counter((p["type"], p["difficulty"]) for p in puzzles if p["shape"])
    print("of which fit for shape-only rounds: "
          + ", ".join(f"{ty} {sum(shape_tbl[(ty, t)] for t in tiers)}" for ty in types))
    print()
    print("Best known 30:")
    best = sorted((p for p in puzzles if p["type"] != "blocks"), key=lambda p: -p["known"])[:30]
    for i in range(0, len(best), 3):
        print("  " + " · ".join(f"{p['name']['hu']} ({p['known']})" for p in best[i:i + 3]))
    print()
    print("Skipped:")
    for k, v in sorted((rej_s + rej_a).items()):
        print(f"  {k}: {v}")
    print()
    print("10 random examples:")
    rnd = random.Random(42)
    for p in rnd.sample(puzzles, min(10, len(puzzles))):
        unit = "m" if p["kind"] == "line" else "m²"
        print(f"  {p['id']}  {p['type']:<8} {p['difficulty']:<6} {p['size']:>7} {unit:<2}  "
              f"{p['name']['hu']} / {p['name']['ro']}  [{p['hood']['hu']}]")


if __name__ == "__main__":
    main()
