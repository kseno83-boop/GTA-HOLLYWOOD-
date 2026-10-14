#!/usr/bin/env python3
"""Anteprima SVG dell'area di gioco (centro di Legnano) a partire da dati OpenStreetMap.

Uso:
    python3 tools/osm_preview.py [file.osm] [output.svg]

Se il file .osm non esiste viene scaricato dall'API di OpenStreetMap.
Dati (c) OpenStreetMap contributors, licenza ODbL.
"""
import math
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

# Area di download (leggermente piu' ampia) e area di gioco proposta.
DOWNLOAD_BBOX = (8.9100, 45.5870, 8.9280, 45.5990)  # min_lon, min_lat, max_lon, max_lat
PLAY_BBOX = (8.9100, 45.5870, 8.9260, 45.5985)  # a ovest arriva fino a ferrovia e stazione
HOLLYWOOD = (45.5928833, 8.9186025)  # Bar Hollywood, Corso Magenta 44 (nodo OSM 5875317518)
PX_PER_M = 0.6

ROAD_WIDTH = {
    "primary": 9, "secondary": 8, "tertiary": 7, "unclassified": 6, "residential": 5,
    "living_street": 4, "pedestrian": 6, "service": 3, "footway": 1.5, "cycleway": 1.5,
    "steps": 1.5, "path": 1.2,
}
PEDESTRIAN = {"pedestrian", "footway", "steps", "path", "living_street"}


def load(path):
    if not os.path.exists(path):
        url = "https://api.openstreetmap.org/api/0.6/map?bbox=%s,%s,%s,%s" % DOWNLOAD_BBOX
        print("Scarico", url)
        urllib.request.urlretrieve(url, path)
    return ET.parse(path).getroot()


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "centro.osm"
    out = sys.argv[2] if len(sys.argv) > 2 else "docs/mappa-area-gioco.svg"
    root = load(src)
    min_lon, min_lat, max_lon, max_lat = PLAY_BBOX
    lat0 = (min_lat + max_lat) / 2
    m_lon = 111320 * math.cos(math.radians(lat0))
    m_lat = 110540
    width_m = (max_lon - min_lon) * m_lon
    height_m = (max_lat - min_lat) * m_lat
    W, H = width_m * PX_PER_M, height_m * PX_PER_M

    def xy(lat, lon):
        return ((lon - min_lon) * m_lon * PX_PER_M, (max_lat - lat) * m_lat * PX_PER_M)

    nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}

    def tags(e):
        return {t.get("k"): t.get("v") for t in e.findall("tag")}

    def pts(way):
        return [xy(*nodes[nd.get("ref")]) for nd in way.findall("nd") if nd.get("ref") in nodes]

    def poly(p):
        return " ".join("%.1f,%.1f" % q for q in p)

    layers = {k: [] for k in ("green", "water", "buildings", "rail", "roads_casing", "roads", "ped", "labels", "pois")}
    for w in root.iter("way"):
        t = tags(w)
        p = pts(w)
        if len(p) < 2:
            continue
        closed = w.findall("nd")[0].get("ref") == w.findall("nd")[-1].get("ref")
        if t.get("leisure") in ("park", "garden", "pitch") or t.get("landuse") in ("grass", "meadow", "forest", "recreation_ground"):
            if closed:
                layers["green"].append('<polygon points="%s"/>' % poly(p))
        elif t.get("natural") == "water" and closed:
            layers["water"].append('<polygon points="%s"/>' % poly(p))
        elif t.get("waterway") in ("river", "canal", "ditch"):
            sw = 14 if t["waterway"] == "river" else 3
            layers["water"].append('<polyline points="%s" fill="none" stroke-width="%d"/>' % (poly(p), sw))
        elif "building" in t and closed:
            layers["buildings"].append('<polygon points="%s"/>' % poly(p))
        elif t.get("railway") == "rail":
            layers["rail"].append('<polyline points="%s"/>' % poly(p))
        elif t.get("highway") in ROAD_WIDTH:
            hw = t["highway"]
            sw = ROAD_WIDTH[hw]
            if hw in PEDESTRIAN:
                layers["ped"].append('<polyline points="%s" stroke-width="%.1f"/>' % (poly(p), sw))
            else:
                layers["roads_casing"].append('<polyline points="%s" stroke-width="%.1f"/>' % (poly(p), sw + 2))
                layers["roads"].append('<polyline points="%s" stroke-width="%.1f"/>' % (poly(p), sw))

    poi_style = {
        "bar": ("#e8a33d", 4), "pub": ("#e8a33d", 4), "cafe": ("#c9b26b", 3),
        "police": ("#3d7be8", 6), "place_of_worship": ("#9a7fd1", 5), "townhall": ("#9a7fd1", 5),
        "cinema": ("#9a7fd1", 4), "theatre": ("#9a7fd1", 4), "fuel": ("#d14b4b", 4),
    }
    labelled = {"Basilica di San Magno", "Municipio di Legnano", "Cinema Teatro Galleria",
                "Carabinieri - Comando Compagnia Legnano", "Comando polizia locale",
                "Polizia di Stato - Commissariato Legnano"}
    for e in list(root.iter("node")) + list(root.iter("way")):
        t = tags(e)
        a = t.get("amenity")
        if a not in poi_style:
            continue
        if e.tag == "node":
            lat, lon = nodes[e.get("id")]
        else:
            ll = [nodes[nd.get("ref")] for nd in e.findall("nd") if nd.get("ref") in nodes]
            if not ll:
                continue
            lat, lon = sum(a_ for a_, _ in ll) / len(ll), sum(b for _, b in ll) / len(ll)
        if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
            continue
        x, y = xy(lat, lon)
        col, r = poi_style[a]
        layers["pois"].append('<circle cx="%.1f" cy="%.1f" r="%d" fill="%s" stroke="#111" stroke-width="1"/>' % (x, y, r, col))
        if t.get("name") in labelled:
            dy = -8 if t["name"].startswith("Polizia") else 4  # evita sovrapposizione con il Municipio
            layers["labels"].append('<text x="%.1f" y="%.1f">%s</text>' % (x + 8, y + dy, t["name"]))

    hx, hy = xy(*HOLLYWOOD)
    star = []
    for i in range(10):
        ang = math.pi / 2 + i * math.pi / 5
        rad = 16 if i % 2 == 0 else 7
        star.append((hx + rad * math.cos(ang), hy - rad * math.sin(ang)))

    # griglia 100 m
    grid = []
    step = 100 * PX_PER_M
    gx = 0.0
    while gx <= W:
        grid.append('<line x1="%.1f" y1="0" x2="%.1f" y2="%.1f"/>' % (gx, gx, H))
        gx += step
    gy = 0.0
    while gy <= H:
        grid.append('<line x1="0" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (gy, W, gy))
        gy += step

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H + 60:.0f}" viewBox="0 0 {W:.0f} {H + 60:.0f}" font-family="Helvetica, Arial, sans-serif">
<rect width="100%" height="100%" fill="#1b1d22"/>
<g fill="#2c4a2e">{''.join(layers["green"])}</g>
<g fill="#2b5d8c" stroke="#2b5d8c">{''.join(layers["water"])}</g>
<g fill="#3a3d45" stroke="#4a4e58" stroke-width="0.6">{''.join(layers["buildings"])}</g>
<g stroke="#8a6d4b" stroke-width="4" stroke-dasharray="10 6" fill="none">{''.join(layers["rail"])}</g>
<g stroke="#111" fill="none" stroke-linecap="round" stroke-linejoin="round">{''.join(layers["roads_casing"])}</g>
<g stroke="#7d7f86" fill="none" stroke-linecap="round" stroke-linejoin="round">{''.join(layers["roads"])}</g>
<g stroke="#b8a98c" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">{''.join(layers["ped"])}</g>
<g stroke="#ffffff" stroke-opacity="0.06">{''.join(grid)}</g>
<g>{''.join(layers["pois"])}</g>
<polygon points="{poly(star)}" fill="#ff2e63" stroke="#fff" stroke-width="1.5"/>
<text x="{hx + 20:.0f}" y="{hy + 5:.0f}" fill="#ff2e63" font-size="16" font-weight="bold">BAR HOLLYWOOD (hub)</text>
<g fill="#d8dbe2" font-size="11">{''.join(layers["labels"])}</g>
<g transform="translate(0,{H:.0f})" font-size="12" fill="#d8dbe2">
<rect width="{W:.0f}" height="60" fill="#111"/>
<text x="10" y="20">Area di gioco proposta: {width_m:.0f} x {height_m:.0f} m - griglia 100 m - Nord in alto</text>
<polyline points="455,40 485,40" stroke="#8a6d4b" stroke-width="4" stroke-dasharray="10 6"/><text x="492" y="44">ferrovia</text>
<circle cx="16" cy="40" r="4" fill="#e8a33d"/><text x="26" y="44">bar/pub</text>
<circle cx="96" cy="40" r="3" fill="#c9b26b"/><text x="106" y="44">caffe'</text>
<circle cx="166" cy="40" r="5" fill="#3d7be8"/><text x="176" y="44">forze dell'ordine</text>
<circle cx="296" cy="40" r="5" fill="#9a7fd1"/><text x="306" y="44">landmark</text>
<circle cx="386" cy="40" r="4" fill="#d14b4b"/><text x="396" y="44">benzinaio</text>
<text x="{W - 10:.0f}" y="44" text-anchor="end" fill="#8a8d96">Dati (c) OpenStreetMap contributors, ODbL</text>
</g>
</svg>
'''
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(svg)
    print("Scritto %s (%.0f x %.0f m)" % (out, width_m, height_m))


if __name__ == "__main__":
    main()
