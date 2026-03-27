# NodeVerse

An interactive 3D universe of knowledge. Fly through 100,000 research papers and patents visualized as stars in a galaxy, connected by real citation links.

**[Live Demo](https://node-verse.vercel.app)** | **[Showtime (30s cinematic tour)](https://node-verse.vercel.app/?demo=true)**

## What is this?

Every dot is a real paper or patent. Every line is a real citation. Papers and patents in the same field naturally cluster together like constellations. You can orbit, zoom, search, filter, and trace citation paths across the entire graph.

Currently loaded:
- **100,000 arXiv papers** across 8 research fields (Computer Science, Mathematics, Physics, Statistics, Electrical Engineering, Quantitative Biology, Quantitative Finance, Economics)
- **100,000 USPTO patents** across 9 CPC sections (Human Necessities, Operations & Transport, Chemistry, Textiles, Fixed Constructions, Mechanical Engineering, Physics, Electricity, Emerging Tech)

## Features

- **3D Galaxy Visualization** - 100k nodes rendered via custom GLSL shaders with glow, fog, and ambient dust
- **Real Citation Links** - Animated connection lines between citing papers/patents
- **Citation Path Tracer** - Find the shortest citation path between any two nodes (six degrees of separation for knowledge)
- **Category Filtering** - Toggle research fields on/off, watch clusters appear and vanish
- **Search** - Find papers by title, authors, or ID
- **Cinematic Demo Mode** - Automated 30-second tour via `?demo=true`
- **Dual Datasets** - Switch between papers and patents with one click
- **Minimap** - Always-visible overview of the full galaxy
- **Keyboard Navigation** - Arrow keys to jump between nodes, R to reset, Escape to deselect
- **Mobile Support** - Touch-friendly with responsive panels

## Tech Stack

- **React 19** + TypeScript
- **Three.js** via React Three Fiber + Drei
- **Custom GLSL Shaders** for star rendering, connection pulses, and ambient dust
- **GSAP** for camera animations (fly-to, orbit, cinematic sequences)
- **Vite 8** for dev/build
- **Vercel** for deployment

## Getting Started

```bash
# Clone
git clone https://github.com/sourabhkumbhar/NodeVerse.git
cd NodeVerse

# Install
npm install

# Run
npm run dev
```

Open http://localhost:5173

## Bring Your Own Data

NodeVerse works with any dataset that has **nodes** and **edges**. Drop a JSON file in `public/data/` with this shape:

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "title": "Node Title",
      "category": "category-id",
      "x": 10.5, "y": -3.2, "z": 7.8,
      "citationCount": 42
    }
  ],
  "edges": [
    { "source": 0, "target": 1 }
  ]
}
```

Then create a config in `src/config/` following the pattern in `patents.ts` or `papers.ts`.

Movie recommendations, song samples, court cases, recipe ingredients, whatever. If your data has things and connections between those things, it becomes a galaxy.

## Data Pipelines

```bash
# Fetch and process 100k USPTO patents
npm run fetch-data

# Fetch and process 100k arXiv papers
npm run fetch-papers
```

Both pipelines sample, cluster, compute spatial positions, and output the JSON format NodeVerse expects.

## Scaling

Right now it's showing 100k out of millions. arXiv has close to 3 million papers. USPTO has tens of millions of patents. The engine can handle more.

## Acknowledgments

- [OpenAlex](https://openalex.org/) for open research paper metadata
- [USPTO PatentsView](https://patentsview.org/) for freely available patent data
- [Claude](https://claude.ai) for being the best pair programmer

## License

MIT
