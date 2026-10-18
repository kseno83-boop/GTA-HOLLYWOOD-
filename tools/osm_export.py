#!/usr/bin/env python3
"""Esporta i dati OSM del centro di Legnano in demo/map-data.js per la demo giocabile.

Uso: python3 tools/osm_export.py [file.osm] [output.js]
Coordinate in decimetri, origine nell'angolo nord-ovest dell'area di gioco, y verso sud.
Dati (c) OpenStreetMap contributors, licenza ODbL.
"""
import json
import math
import sys
import xml.etree.ElementTree as ET

from osm_preview import HOLLYWOOD, PLAY_BBOX, load

ROAD_TYPES = ["primary", "secondary", "tertiary", "unclassified", "residential", "living_street",
              "service", "pedestrian", "footway", "cycleway", "steps", "path"]
GREEN = {"park", "garden", "pitch", "grass", "meadow", "forest", "recreation_ground", "playground"}
POI = {"bar": 0, "pub": 0, "cafe": 1, "police": 2, "place_of_worship": 3, "townhall": 3, "fuel": 4}
# Punti d'interesse del gioco: nodo OSM, nome mostrato, tipo.
# Stuzzi Sushi (Corso Magenta 41) in OSM compare ancora come "SushiMi".
PLACES = [("938876437", "BAR MARAMAO", "rival"), ("5875318295", "BAR MORELLO", "rival"),
          ("8520102600", "STUZZI SUSHI", "food"), ("4327352411", "GRAN PRIX", "food")]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "centro.osm"
    out = sys.argv[2] if len(sys.argv) > 2 else "demo/map-data.js"
    root = load(src)
    min_lon, min_lat, max_lon, max_lat = PLAY_BBOX
    lat0 = (min_lat + max_lat) / 2
    m_lon = 111320 * math.cos(math.radians(lat0))
    m_lat = 110540
    W = (max_lon - min_lon) * m_lon
    H = (max_lat - min_lat) * m_lat
    pad = 60

    def xy(lat, lon):
        return ((lon - min_lon) * m_lon, (max_lat - lat) * m_lat)

    nodes = {n.get("id"): xy(float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}

    def inside(p):
        return -pad <= p[0] <= W + pad and -pad <= p[1] <= H + pad

    def tags(e):
        return {t.get("k"): t.get("v") for t in e.findall("tag")}

    def dm(v):
        return int(round(v * 10))

    gnode, gidx = [], {}
    names, name_idx = [], {}
    buildings, roads, green, water, rivers, rails, pois = [], [], [], [], [], [], []
    for w in root.iter("way"):
        t = tags(w)
        refs = [nd.get("ref") for nd in w.findall("nd") if nd.get("ref") in nodes]
        pts = [nodes[r] for r in refs]
        if len(pts) < 2 or not any(inside(p) for p in pts):
            continue
        closed = refs[0] == refs[-1]
        flat = [dm(c) for p in (pts[:-1] if closed else pts) for c in p]
        if t.get("highway") in ROAD_TYPES:
            ids = []
            for r in refs:
                if r not in gidx:
                    gidx[r] = len(gnode) // 2
                    gnode.extend(dm(c) for c in nodes[r])
                ids.append(gidx[r])
            nm = t.get("name")
            if nm and nm not in name_idx:
                name_idx[nm] = len(names)
                names.append(nm)
            roads.append([ROAD_TYPES.index(t["highway"]), name_idx.get(nm, -1)] + ids)
        elif "building" in t and closed and len(pts) > 3:
            try:
                h = float(t.get("building:levels", "3")) * 3.2
            except ValueError:
                h = 9.6
            buildings.append([round(min(h, 40))] + flat)
        elif (t.get("leisure") in GREEN or t.get("landuse") in GREEN) and closed:
            green.append(flat)
        elif t.get("natural") == "water" and closed:
            water.append(flat)
        elif t.get("waterway") == "river":
            rivers.append(flat)
        elif t.get("railway") == "rail":
            rails.append(flat)
    for n in root.iter("node"):
        t = tags(n)
        if t.get("amenity") in POI and inside(nodes[n.get("id")]):
            pois.append([POI[t["amenity"]]] + [dm(c) for c in nodes[n.get("id")]])

    def door_near(hx, hy):
        """Punto piu' vicino su una strada o un marciapiede: li' mettiamo la porta."""
        best = (1e9, hx, hy)
        for r in roads:
            ids = r[2:]
            for a, b in zip(ids, ids[1:]):
                ax, ay, bx, by = gnode[2 * a] / 10, gnode[2 * a + 1] / 10, gnode[2 * b] / 10, gnode[2 * b + 1] / 10
                dx, dy = bx - ax, by - ay
                L = dx * dx + dy * dy or 1
                k = max(0, min(1, ((hx - ax) * dx + (hy - ay) * dy) / L))
                px, py = ax + k * dx, ay + k * dy
                d = math.hypot(px - hx, py - hy)
                if d < best[0]:
                    best = (d, px, py)
        return best

    hx, hy = xy(*HOLLYWOOD)
    best = door_near(hx, hy)
    places = []
    for nid, name, kind in PLACES:
        px, py = nodes[nid]
        _, dx, dy = door_near(px, py)
        places.append([name, kind, dm(px), dm(py), dm(dx), dm(dy)])
    data = {"w": dm(W), "h": dm(H), "nodes": gnode, "roads": roads, "names": names, "types": ROAD_TYPES,
            "buildings": buildings, "green": green, "water": water, "rivers": rivers, "rails": rails,
            "pois": pois, "places": places, "bar": [dm(hx), dm(hy)], "door": [dm(best[1]), dm(best[2])]}
    with open(out, "w", encoding="utf-8") as f:
        f.write("// Generato da tools/osm_export.py. Dati (c) OpenStreetMap contributors, ODbL.\n")
        f.write("window.MAP=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print("Scritto %s: %d edifici, %d strade, %d nodi, porta a %.1f m dal nodo del bar"
          % (out, len(buildings), len(roads), len(gnode) // 2, best[0]))


if __name__ == "__main__":
    main()
