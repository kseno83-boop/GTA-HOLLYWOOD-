#!/usr/bin/env python3
"""Punti d'interesse del centro di Legnano per il gioco (elenco approvato dall'utente).

Uso: python3 tools/osm_poi.py [file.osm] [map.json] [output]
  predefiniti: centro.osm, game/src/data/map.json, game/src/data/poi.json
Per ogni punto: nome mostrato, categoria, posizione (nodo OSM o centro della way) e porta (punto piu' vicino
su una strada o un marciapiede del grafo di map.json). Coordinate in decimetri come map.json.
Banche, gioiellerie, sala giochi e tabaccheria stanno nei posti veri ma con nomi inventati (sono bersagli di reati).
Dati (c) OpenStreetMap contributors, licenza ODbL.
"""
import json
import math
import sys

from osm_preview import PLAY_BBOX, load

# (tipo e id OSM, nome nel gioco, categoria)
POIS = [
    # forze dell'ordine e soccorso
    ("w355107955", "CARABINIERI", "police"),
    ("n5076678544", "COMMISSARIATO", "police"),
    ("w355097410", "POLIZIA LOCALE", "police"),
    ("w355680049", "VIGILI DEL FUOCO", "fire"),
    ("n251033690", "STAZIONE", "station"),
    # monumenti e luoghi storici
    ("w258517079", "BASILICA DI SAN MAGNO", "landmark"),
    ("n4622259693", "MUNICIPIO", "landmark"),
    ("n2318683850", "MONUMENTO AL GUERRIERO", "landmark"),
    ("w277735780", "TORRE COLOMBERA", "landmark"),
    ("w24827565", "PALAZZO MALINVERNI", "landmark"),
    ("w279360003", "PALAZZO LEONE DA PEREGO", "landmark"),
    ("n3666547742", "CARRO ARMATO", "landmark"),
    ("n2808123329", "FONTANA DI SHINGU", "landmark"),
    # spettacoli
    ("n8390270042", "TEATRO CITTÀ DI LEGNANO", "show"),
    ("n868475135", "CINEMA RATTI", "show"),
    ("n714791302", "CINEMA TEATRO GALLERIA", "show"),
    # mangiare (salute piena) e gelaterie (meta' salute)
    ("n5875317651", "PIADAMI", "food"),
    ("n5875317515", "ROSTICCERIA ZHENG", "food"),
    ("n13446134147", "VOGLIA DI PIZZA", "food"),
    ("n3739305791", "KING ISTANBUL KEBAB", "food"),
    ("n714808683", "BURGER KING", "food"),
    ("n4838231559", "PIZZERIA SAN BERNARDINO", "food"),
    ("n5076676845", "PASTICCERIA GOBBI", "food"),
    ("n5875317503", "VANILLA", "gelato"),
    ("n936019977", "SOLE LUNA", "gelato"),
    # bar neutrali
    ("n3054601617", "ROLLING STONES", "bar"),
    ("n5875317840", "BAR DEI CAPITANI", "bar"),
    ("n5076676892", "CAFFÈ FARMACIA", "bar"),
    ("n939298768", "KEPOS", "bar"),
    ("n938876440", "THE MODE", "bar"),
    ("n3739305794", "CHANTAL LOUNGE BAR", "bar"),
    ("n5875317654", "TRICICLO", "bar"),
    ("n938876443", "LA VECCHIA LEGNANO", "bar"),
    ("n937182245", "CIRCOLO FRATELLANZA E PACE", "bar"),
    # bersagli di rapine e gioco d'azzardo: posti veri, nomi inventati
    ("n4483441411", "BANCA DEL CARROCCIO", "bank"),       # Corso Italia 49
    ("n5076675202", "CREDITO DEL GUERRIERO", "bank"),     # Corso Italia 34
    ("n5875317824", "GIOIELLERIA DEL CORSO", "jewel"),    # Corso Magenta 17
    ("n5875317521", "GIOIELLERIA MAGENTA", "jewel"),      # Corso Magenta 56
    ("n4405369433", "SALA BINGO", "bingo"),               # Via A. da Giussano 16
    ("n4483442802", "TABACCHI", "tabacchi"),              # Piazza San Magno 30
    # farmacie
    ("n4483441405", "FARMACIA CENTRALE", "pharmacy"),
    ("n4483441406", "FARMACIA DEL CORSO", "pharmacy"),
    ("n714815414", "FARMACIA SEMPIONE", "pharmacy"),
    # altro
    ("n227836703", "DISTRIBUTORE", "fuel"),
    ("w532293671", "METROPARK", "parking"),
    ("w80477202", "PARCHEGGIO PIAZZA EUROPA", "parking"),
    ("w179146145", "GALLERIE CANTONI", "shop"),
    ("n5081273583", "GAMES ACADEMY", "shop"),
    ("n4778402571", "MODELLISTICA DEL CARROCCIO", "shop"),
    ("n4350239201", "DISCO STORES", "shop"),
    ("n9854405317", "GHISA FILM LAB", "shop"),
    ("w220751722", "PARCO FALCONE-BORSELLINO", "park"),
    ("w286077057", "GIARDINO DONATORI DEL SANGUE", "park"),
    ("w279579604", "PISCINA COMUNALE", "sport"),
    ("w76426907", "CENTRO SPORTIVO PINO COZZI", "sport"),
]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "centro.osm"
    mp = sys.argv[2] if len(sys.argv) > 2 else "game/src/data/map.json"
    out = sys.argv[3] if len(sys.argv) > 3 else "game/src/data/poi.json"
    root = load(src)
    min_lon, min_lat, max_lon, max_lat = PLAY_BBOX
    lat0 = (min_lat + max_lat) / 2
    m_lon = 111320 * math.cos(math.radians(lat0))
    m_lat = 110540

    def xy(lat, lon):
        return ((lon - min_lon) * m_lon, (max_lat - lat) * m_lat)

    nodes = {n.get("id"): xy(float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}
    ways = {w.get("id"): [nodes[nd.get("ref")] for nd in w.findall("nd") if nd.get("ref") in nodes] for w in root.iter("way")}
    with open(mp, encoding="utf-8") as f:
        M = json.load(f)
    gx, gy = M["nodes"][0::2], M["nodes"][1::2]
    segs = [(r[k], r[k + 1]) for r in M["roads"] for k in range(2, len(r) - 1)]

    def door_near(hx, hy):
        best = (1e9, hx, hy)
        for a, b in segs:
            ax, ay, bx, by = gx[a] / 10, gy[a] / 10, gx[b] / 10, gy[b] / 10
            dx, dy = bx - ax, by - ay
            k = max(0, min(1, ((hx - ax) * dx + (hy - ay) * dy) / (dx * dx + dy * dy or 1)))
            px, py = ax + k * dx, ay + k * dy
            d = math.hypot(px - hx, py - hy)
            if d < best[0]:
                best = (d, px, py)
        return best

    def dm(v):
        return int(round(v * 10))

    pois = []
    for ref, name, cat in POIS:
        if ref[0] == "n":
            x, y = nodes[ref[1:]]
        else:
            pts = ways[ref[1:]]
            if pts[0] == pts[-1]:
                pts = pts[:-1]
            x, y = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        d, dx, dy = door_near(x, y)
        if d > 40:
            print("attenzione: %s a %.0f m dalla strada piu' vicina" % (name, d))
        pois.append([name, cat, dm(x), dm(y), dm(dx), dm(dy)])
    with open(out, "w", encoding="utf-8") as f:
        f.write(json.dumps({"pois": pois}, separators=(",", ":"), ensure_ascii=False) + "\n")
    print("Scritto %s: %d punti d'interesse" % (out, len(pois)))


if __name__ == "__main__":
    main()
