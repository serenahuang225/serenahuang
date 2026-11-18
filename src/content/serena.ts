/**
 * Everything the home page says, in one place. Edit text here rather than in
 * the components.
 */

/** A value card in "Values to live by": the front shows title + prompt, the back the reflection. */
export type Axiom = {
  /** Also used for the card's element id, e.g. "axiom-2-reflection". */
  id: string;
  number: string;
  title: string;
  /** The short line on the front of the card. */
  prompt: string;
  statement: string;
  elaboration: string;
  /** Which drawing goes on the front (see the icon list in values.tsx). */
  icon: "hammer" | "book-open" | "fingerprint" | "activity";
};
export const SERENA_AXIOMS: Axiom[] = [
  {
    id: "axiom-1",
    number: "01",
    prompt: "Think. Make. Understand.",
    title: "Mens et manus",
    statement: "As a student at MIT, I think this is essential :)",
    elaboration:
      "Theories and axioms are only thoughts until applied in the real, physical life. I want to live out my axioms and beliefs and not just think about them. Also, truly learning/understanding something comes from actually building something yourself.",
    icon: "hammer",
  },
  {
    id: "axiom-2",
    number: "02",
    prompt: "Stay curious. Go deeper.",
    title: "Always learn",
    statement:
      "One of my greatest strengths is the ability to adapt and learn.",
    elaboration:
      "The tech industry moves and expands so fast which means I need to stay curious, be adaptable and be excited about learning and rethinking to stay up to date. Also, I will almost never be the expert when I walk into any room, but can soon become competent as long as I stay open, think freely, and dive deep.",
    icon: "book-open",
  },
  {
    id: "axiom-3",
    number: "03",
    prompt: "Show up as yourself.",
    title: "Authenticity",
    statement:
      "I want to present my most genuine self to my work, anyone I meet, and my reflections with myself.",
    elaboration:
      "I want to care deeply about the relationships I have and work I do and I don’t just want to do something for the performative aspect or because that’s what a preconceived notion tells me.",
    icon: "fingerprint",
  },
  {
    id: "axiom-4",
    number: "04",
    prompt: "Train body. Train mind.",
    title: "Healthy body, healthy mind",
    statement: "Stay active and eat delicious, healthy, balanced meals.",
    elaboration:
      "Garbage in, garbage out works for all things in life, including your personal health and training ML models. Furthermore, I believe that training the body builds a foundation for even better training for the mind.",
    icon: "activity",
  },
];
/** The rotating "thought to take with you" at the bottom of the page. */
export const quotes = [
  "Optimize your life, which means taking into account time for sleep.",
  "Find people who will be your advocate and supporter, someone who you can be yourself for.",
  "Think freely and openly.",
  "As important as it is to embrace yourself, you should still recognize that your habits can be shaped and are being shaped by your environment.",
  "Life is a marathon which usually lasts about 80 years.",
  "Sometimes, to make the right decision, you have to make wrong decision(s).",
  "Everyone’s a beginner at some point. Don’t let it stop you from trying something new.",
];
/** The project cards. `slug` picks the cover art in page.tsx; `kind` is what the filter buttons match. */
export const projects: {
  slug: string;
  kind: "Research" | "Product";
  number: string;
  title: string;
  name: string;
  category: string;
  description: string;
  detail: string;
  tags: string[];
  href: string;
  metric: string;
  metricLabel: string;
}[] = [
  {
    slug: "hydrology",
    kind: "Research",
    number: "01",
    title: "Learning the language of water.",
    name: "AI Hydrological Modeling",
    category: "MACHINE LEARNING · RESEARCH",
    description:
      "Transformers meet the natural world. Modeling rainfall across 531 basins to better understand what comes next.",
    detail:
      "Built transformer-based rainfall prediction models in PyTorch using the CAMELS dataset, covering 531 basins with 20–40 years of vegetation, topography, and soil data. Benchmarked single-basin and multi-basin models, achieving a Nash–Sutcliffe Efficiency score of 0.764 and outperforming LSTM baselines by 6%.",
    tags: ["PyTorch", "Transformers", "CAMELS"],
    href: "https://github.com/serenahuang225/transformer-hydro-model",
    metric: "531",
    metricLabel: "basins. one interconnected world.",
  },
  {
    slug: "tunas",
    kind: "Product",
    number: "02",
    title: "A little more than a personal best.",
    name: "Tunas Swim Meet Dashboard",
    category: "FULL-STACK · SPORTS ANALYTICS",
    description:
      "Making the numbers behind the race useful. Swimming analytics, meet simulations, and smarter relay teams.",
    detail:
      "Developed a FastAPI backend with Pydantic models and a Markov Chain Monte Carlo simulator to analyze 800K+ race and relay outcomes for 1.2K+ USA Swimming clubs and 26K+ swimmers. Built a Next.js, TypeScript, and Recharts dashboard for swimmer history, analytics, and relay optimization.",
    tags: ["Next.js", "FastAPI", "MCMC"],
    href: "https://github.com/serenahuang225/tunas-webapp-frontend",
    metric: "800k+",
    metricLabel: "possible outcomes. a clearer next move.",
  },
  {
    slug: "lively",
    kind: "Product",
    number: "03",
    title: "Make room for a fuller life.",
    name: "Lively",
    category: "MOBILE · PRODUCT DESIGN",
    description:
      "A planner and journal for the everyday: your plans, your people, and a little space to reflect.",
    detail:
      "Created a React Native productivity app with dynamic calendars, mood tracking, live chat, and social event planning, scaling to 1K+ iOS App Store downloads and 10K+ monthly interactions. Implemented real-time notifications and friend synchronization with Firebase and Express.js, plus custom gesture-driven UI components.",
    tags: ["React Native", "Firebase", "Figma"],
    href: "https://bubblystudios.com/lively",
    metric: "1k+",
    metricLabel: "downloads. a thousand different days.",
  },
];
/** The photo ribbons. Put the image in public/photos/optimized/ (WebP, about 1600px wide) and add an entry. */
export type Photo = {
  src: string;
  alt: string;
  caption: string;
  location?: string;
};
export const photos: Photo[] = [
  {
    src: "/photos/optimized/frame-15.webp",
    alt: "Stone peaks and open sky",
    caption: "Stone peaks and open sky",
  },
  {
    src: "/photos/optimized/frame-21.webp",
    alt: "Suspended in the evening light",
    caption: "Suspended in the evening light",
  },
  {
    src: "/photos/optimized/frame-23.webp",
    alt: "Lanterns at sunset",
    caption: "Lanterns at sunset",
  },
  {
    src: "/photos/optimized/frame-04.webp",
    alt: "A red panda among green leaves",
    caption: "A red panda among green leaves",
  },
  {
    src: "/photos/optimized/frame-16.webp",
    alt: "The skyline at blue hour",
    caption: "The skyline at blue hour",
  },
  {
    src: "/photos/optimized/frame-09.webp",
    alt: "A study in soft green",
    caption: "A study in soft green",
  },
  {
    src: "/photos/optimized/frame-01.webp",
    alt: "Resting among the branches",
    caption: "Resting among the branches",
  },
  {
    src: "/photos/optimized/frame-02.webp",
    alt: "A flash of gold",
    caption: "A flash of gold",
  },
  {
    src: "/photos/optimized/frame-03.webp",
    alt: "Where the water meets the rocks",
    caption: "Where the water meets the rocks",
  },
  {
    src: "/photos/optimized/frame-05.webp",
    alt: "Stillness in the leaves",
    caption: "Stillness in the leaves",
  },
  {
    src: "/photos/optimized/frame-06.webp",
    alt: "A bridge illuminated at night",
    caption: "A bridge illuminated at night",
  },
  {
    src: "/photos/optimized/frame-07.webp",
    alt: "Reflections after dark",
    caption: "Reflections after dark",
  },
  {
    src: "/photos/optimized/frame-08.webp",
    alt: "Looking down a narrow street",
    caption: "Looking down a narrow street",
  },
  {
    src: "/photos/optimized/frame-10.webp",
    alt: "A hillside of lights",
    caption: "A hillside of lights",
  },
  {
    src: "/photos/optimized/frame-11.webp",
    alt: "A quiet moment in the trees",
    caption: "A quiet moment in the trees",
  },
  {
    src: "/photos/optimized/frame-12.webp",
    alt: "Mountains disappearing into mist",
    caption: "Mountains disappearing into mist",
  },
  {
    src: "/photos/optimized/frame-13.webp",
    alt: "A boat beneath the mountains",
    caption: "A boat beneath the mountains",
  },
  {
    src: "/photos/optimized/frame-14.webp",
    alt: "Above the valley",
    caption: "Above the valley",
  },
  {
    src: "/photos/optimized/frame-17.webp",
    alt: "A penguin by the rocks",
    caption: "A penguin by the rocks",
  },
  {
    src: "/photos/optimized/frame-18.webp",
    alt: "A red panda exploring",
    caption: "A red panda exploring",
  },
  {
    src: "/photos/optimized/frame-19.webp",
    alt: "Looking up between buildings",
    caption: "Looking up between buildings",
  },
  {
    src: "/photos/optimized/frame-20.webp",
    alt: "A city fading into haze",
    caption: "A city fading into haze",
  },
  {
    src: "/photos/optimized/frame-22.webp",
    alt: "Yellow taxis, everyday motion",
    caption: "Yellow taxis, everyday motion",
  },
  {
    src: "/photos/optimized/frame-24.webp",
    alt: "Architecture after dark",
    caption: "Architecture after dark",
  },
  {
    src: "/photos/optimized/frame-25.webp",
    alt: "A bridge across the night",
    caption: "A bridge across the night",
  },
  {
    src: "/photos/optimized/frame-26.webp",
    alt: "Roads along the water",
    caption: "Roads along the water",
  },
  {
    src: "/photos/optimized/frame-27.webp",
    alt: "A companion on the journey",
    caption: "A companion on the journey",
  },
  {
    src: "/photos/optimized/frame-28.webp",
    alt: "Flamingos by the water",
    caption: "Flamingos by the water",
  },
  {
    src: "/photos/optimized/frame-29.webp",
    alt: "Under the bridge at sunset",
    caption: "Under the bridge at sunset",
  },
  {
    src: "/photos/optimized/frame-30.webp",
    alt: "Reptiles at rest",
    caption: "Reptiles at rest",
  },
];
/** The record collection. Put the MP3 in public/music/ and point `audio` at it. */
export type Track = {
  title: string;
  artist: string;
  audio: string;
};
export const listening: Track[] = [
  {
    title:
      "Return to the Eternal Wind (feat. Hong Wang & Vanessa Freebairn-Smith)",
    artist: "Jeremy Zuckerman, Hong Wang, Vanessa Freebairn-Smith",
    audio:
      "/music/Jeremy Zuckerman, Hong Wang, Vanessa Freebairn-Smith - Return to the Eternal Wind (feat. Hong Wang & Vanessa Freebairn-Smith).mp3",
  },
  {
    title: "Odysseus",
    artist: "Ludwig Göransson",
    audio: "/music/Ludwig Göransson - Odysseus.mp3",
  },
  {
    title: "Sirens",
    artist: "Ludwig Göransson",
    audio: "/music/Ludwig Göransson - Sirens.mp3",
  },
];
