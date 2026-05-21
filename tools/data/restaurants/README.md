# Sběrač datasetu restaurací z Google Places

Tento skript slouží k sběru dat o restauracích, kavárnách, barech a podobných místech pomocí **Google Places Text Search API**. 
Výchozí lokací je centrum Prahy.

## Požadavky

- Google API klíč se zapnutým **Places API (New)**
- Python 3 + balíčky: `requests`, `tqdm`

## Jak spustit

```sh
# 1. Nastavte svůj API klíč
export GOOGLE_API_KEY="your_key_here"

# Nebo jej předejte přímo
python google_places_aggregator.py --api-key your_key_here
```

Základní spuštění, výchozí Praha + 20 stránek:

```sh
python google_places_aggregator.py --api-key your_key_here --download-photos
```

### Užitečné argumenty

- `--lat 50.08804 --lng 14.42076` – střed vyhledávání, výchozí: Praha
- `--radius 12000` – poloměr vyhledávání v metrech, výchozí: 12 km
- `--pages 20` – počet stránek výsledků pro každé klíčové slovo
- `--page-size 20` – počet výsledků na stránku
- `--keywords-file keywords.json` – vlastní seznam vyhledávacích klíčových slov
- `--download-photos` – stáhne fotografie, které budou uloženy do `out/places_photos/`

## Struktura výstupu

```text
out/
├── tmp/
│   ├── restaurant.json
│   ├── cafe.json
│   ├── bar.json
│   └── ...                  ← jeden soubor pro každé klíčové slovo
└── all_places.json          ← finální deduplikovaný dataset připravený k použití
    places_photos/           ← pouze pokud byl použit argument --download-photos
```

Soubor `all_places.json` je připravený pro váš projekt — stačí jej zkopírovat do:

```sh
services/activity-recommendation-system/datasets/restaurants/all_places.json
```