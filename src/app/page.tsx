"use client";
import dynamic from "next/dynamic";
import SilverCursor from "@/components/silver-cursor";
import MusicPlayer from "@/components/music-player";
import Values from "@/components/values";
import Experience from "@/components/experience";
import PhotoGallery from "@/components/photo-gallery";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  Plus,
  X,
  Headphones,
  Pause,
  Play,
  Camera,
  Fingerprint,
  BookOpen,
  Hammer,
  Activity,
} from "lucide-react";
import {
  SERENA_AXIOMS,
  quotes,
  projects,
  photos,
  type Photo,
} from "@/content/serena";
const GlassScene = dynamic(() => import("@/components/glass-scene"), {
  ssr: false,
});
const sections = ["Home", "Work", "Values", "Photos", "Listening", "About"];
const icons = {
  hammer: Hammer,
  "book-open": BookOpen,
  fingerprint: Fingerprint,
  activity: Activity,
};
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="lens-fallback">
        <i />
        <i />
        <i />
      </div>
    ) : (
      this.props.children
    );
  }
}
function ProjectArt({ kind }: { kind: string }) {
  return (
    <div className={`project-art ${kind}`} aria-hidden="true">
      {kind === "hydrology" && (
        <>
          <div className="contours">
            {Array.from({ length: 12 }, (_, i) => (
              <i
                key={i}
                style={{
                  width: `${28 + i * 7}%`,
                  height: `${20 + i * 8}%`,
                  transform: `translate(-50%,-50%) rotate(${-30 + i * 5}deg)`,
                }}
              />
            ))}
          </div>
          <span className="art-coordinate">38° N &nbsp; / &nbsp; 97° W</span>
          <div className="art-cross">+</div>
          <span className="art-bottom">PATTERNS IN THE NATURAL WORLD</span>
        </>
      )}
      {kind === "tunas" && (
        <>
          <div className="pool-lanes">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <span className="pool-word">
            tunas<span>↗</span>
          </span>
          <span className="art-bottom">EVERY FRACTION COUNTS.</span>
        </>
      )}
      {kind === "lively" && (
        <>
          <div className="lively-orbit orbit-one" />
          <div className="lively-orbit orbit-two" />
          <div className="lively-note">
            <span>A LITTLE SPACE FOR</span>
            <strong>
              your
              <br />
              <em>everyday.</em>
            </strong>
            <div className="note-dots">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span>lively</span>
          </div>
        </>
      )}
    </div>
  );
}
export default function Home() {
  const hero = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const depth = useRef(0);
  const lensPosition = useRef<HTMLElement>(null);
  const cameraPointer = useRef({ x: 0, y: 0 });
  const [lensOpen, setLensOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [still, setStill] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const [inHero, setInHero] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<(typeof projects)[number] | null>(
    null,
  );
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [quote, setQuote] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const lensDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (lensOpen) lensDialog.current?.showModal();
    else lensDialog.current?.close();
  }, [lensOpen]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setStill(media.matches);
    const change = () => setStill(media.matches);
    media.addEventListener("change", change);
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setCanRender(!!gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = still ? "still" : "full";
    let frame = 0;
    const update = () => {
      const el = hero.current;
      if (el) {
        progress.current = Math.min(
          1,
          Math.max(
            0,
            -el.getBoundingClientRect().top /
              Math.max(1, el.offsetHeight - innerHeight),
          ),
        );
        el.style.setProperty("--entry", String(still ? 0 : progress.current));
        depth.current = scrollY / Math.max(1, innerHeight * 5);
        const mobile = innerWidth <= 700;
        const startSize = mobile
          ? Math.min(innerWidth * 0.9, innerHeight * 0.4)
          : Math.min(innerWidth * 0.47, innerHeight * 0.64, 620);
        const dockSize = mobile ? 86 : 116;
        const travel = still
          ? scrollY > innerHeight * 0.45
            ? 1
            : 0
          : Math.min(1, Math.max(0, progress.current));
        const center = Math.min(1, travel / 0.5);
        const mix = center * center * (3 - 2 * center);
        const startX = innerWidth * (mobile ? 0.56 : 0.72) - startSize / 2;
        const startY = innerHeight * (mobile ? 0.69 : 0.47) - startSize / 2;
        const fullSize = Math.max(innerWidth, innerHeight) * 1.6;
        const entering = travel < 0.94;
        const size = entering
          ? startSize + (fullSize - startSize) * mix
          : dockSize;
        const x = entering
          ? startX + ((innerWidth - fullSize) / 2 - startX) * mix
          : innerWidth - dockSize - 20;
        const y = entering
          ? startY + ((innerHeight - fullSize) / 2 - startY) * mix
          : innerHeight - dockSize - 48;
        const opacity = still
          ? 1
          : entering
            ? 1 - Math.min(1, Math.max(0, (travel - 0.76) / 0.18))
            : Math.min(1, (travel - 0.94) / 0.06);
        lensPosition.current?.style.setProperty(
          "transform",
          `translate3d(${x}px,${y}px,0) scale(${size / 600})`,
        );
        lensPosition.current?.style.setProperty("opacity", String(opacity));
        lensPosition.current?.style.setProperty(
          "pointer-events",
          travel > 0.15 && travel < 1 ? "none" : "",
        );
        const aperture =
          still || !entering
            ? 0
            : Math.min(45, Math.max(0, ((travel - 0.4) / 0.5) * 45));
        lensPosition.current?.style.setProperty("--aperture", `${aperture}%`);
        lensPosition.current?.style.setProperty(
          "--aperture-edge",
          `${aperture ? aperture + 1.5 : 0}%`,
        );
        setInHero(entering);
      }
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [still]);
  useEffect(() => {
    if (location.hash === "#writing") {
      history.replaceState(null, "", "#values");
      document
        .getElementById("values")
        ?.scrollIntoView({ behavior: "instant" });
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    document
      .querySelectorAll("main > section[id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  useEffect(() => {
    if (photo) photoDialog.current?.showModal();
  }, [photo]);
  const visibleProjects = projects.filter(
    (p) =>
      filter === "All" ||
      (filter === "Research" ? p.slug === "hydrology" : p.slug !== "hydrology"),
  );
  return (
    <>
      <a className="skip-link" href="#work">
        Skip to selected work
      </a>
      <header
        className={`header ${["photos", "listening", "about"].includes(active) ? "header-dark" : ""}`}
      >
        <a className="wordmark" href="#home" aria-label="Serena Huang, home">
          ssh
        </a>
        <nav aria-label="Main navigation">
          {sections.map((label, i) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className={active === label.toLowerCase() ? "active" : ""}
              aria-current={
                active === label.toLowerCase() ? "location" : undefined
              }
            >
              {i === 0 ? <span className="nav-home">S.</span> : label}
            </a>
          ))}
        </nav>
        <a className="header-contact" href="mailto:serenahuang@mit.edu">
          Say hello <ArrowUpRight size={15} />
        </a>
      </header>
      <SilverCursor still={still} />
      <aside
        ref={lensPosition}
        className={`lens-navigation ${inHero ? "lens-intro" : "lens-docked"}`}
        aria-label="Lens navigation"
      >
        <div className="lens-render" aria-hidden="true">
          <div
            className={`lens-fallback ${canRender ? "lens-fallback-muted" : ""}`}
          >
            <i />
            <i />
            <i />
          </div>
          {canRender && (
            <SceneBoundary>
              <GlassScene
                progress={progress}
                depth={depth}
                still={still}
                docked={!inHero}
                pointer={cameraPointer}
              />
            </SceneBoundary>
          )}
        </div>
        <button
          className="lens-trigger"
          onPointerMove={(event) => {
            if (still || !inHero || event.pointerType !== "mouse") return;
            const rect = event.currentTarget.getBoundingClientRect();
            cameraPointer.current = {
              x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
              y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
            };
          }}
          onPointerLeave={() => {
            cameraPointer.current = { x: 0, y: 0 };
          }}
          onBlur={() => {
            cameraPointer.current = { x: 0, y: 0 };
          }}
          onKeyDown={(event) => {
            if (still || !inHero) return;
            if (
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                event.key,
              )
            ) {
              event.preventDefault();
              const p = cameraPointer.current;
              cameraPointer.current = {
                x: Math.max(
                  -1,
                  Math.min(
                    1,
                    p.x +
                      (event.key === "ArrowLeft"
                        ? -0.3
                        : event.key === "ArrowRight"
                          ? 0.3
                          : 0),
                  ),
                ),
                y: Math.max(
                  -1,
                  Math.min(
                    1,
                    p.y +
                      (event.key === "ArrowUp"
                        ? -0.3
                        : event.key === "ArrowDown"
                          ? 0.3
                          : 0),
                  ),
                ),
              };
            }
          }}

          data-cursor-label="Explore"
          aria-label="Explore through the lens"
          aria-expanded={lensOpen}
          aria-controls="lens-menu"
          onClick={() => setLensOpen(!lensOpen)}
        >
          <span>
            {inHero
              ? "CHOOSE A PERSPECTIVE"
              : `${String(
                  Math.max(
                    0,
                    sections.findIndex((s) => s.toLowerCase() === active),
                  ),
                ).padStart(2, "0")} / ${active.toUpperCase()}`}
          </span>
        </button>
      </aside>
      <dialog
        ref={lensDialog}
        id="lens-menu"
        className="lens-dialog"
        aria-label="Choose a perspective"
        onClose={() => setLensOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLensOpen(false);
        }}
      >
        <nav className="lens-menu" aria-label="Choose a perspective">
          <div className="lens-menu-heading">
            <span>CHOOSE A PERSPECTIVE</span>
            <button
              aria-label="Close lens navigation"
              onClick={() => setLensOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          {sections.map((label, i) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              onClick={() => setLensOpen(false)}
              aria-current={
                active === label.toLowerCase() ? "location" : undefined
              }
            >
              <span>{String(i).padStart(2, "0")}</span>
              {label}
              <ArrowUpRight size={16} />
            </a>
          ))}
        </nav>
      </dialog>
      <main>
        <section className="hero" id="home" ref={hero}>
          <div className="hero-sticky">
            <div className="hero-ambient" />
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="status-dot" /> ALWAYS IN MOTION
              </p>
              <h1>
                Serena
                <br />
                <em>Huang</em>
                <span className="name-period">.</span>
              </h1>
              <p className="hero-description">
                Think freely, build thoughtfully,
                <br />
                and find a little fun and wonder in between :)
              </p>
              <a className="text-link" href="#work">
                take a look into my world <ArrowDown size={16} />
              </a>
            </div>
            <div className="sculpture-caption">
              <span>001 — THROUGH THE LENS</span>
              <span>Scroll into the lens. See what’s on the other side.</span>
            </div>
            <div className="hero-bottom">
              <span>MATHEMATICS, AI & THE THINGS THAT MAKE US HUMAN</span>
              <a href="#work">
                SCROLL TO EXPLORE <ArrowDown size={13} />
              </a>
            </div>
            {/* <span className="hero-margin">
              A PERSONAL COLLECTION / ALWAYS EVOLVING
            </span> */}
          </div>
        </section>
        <section className="work section-pad" id="work">
          <div className="section-top">
            <span className="eyebrow">01 / THINGS I’VE BUILT</span>
            <span className="quiet">A few ideas I've brought to life.</span>
          </div>
          <div className="section-heading">
            <h2>
              Curiosity,
              <br />
              <em>put to work.</em>
            </h2>
            <div className="filters" aria-label="Filter projects">
              {["All", "Research", "Product"].map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="project-grid">
            {visibleProjects.map((project) => (
              <button
                key={project.slug}
                className="project"
                onClick={() => setSelected(project)}
                aria-label={`Read about ${project.name}`}
              >
                <div className="art-wrap">
                  <ProjectArt kind={project.slug} />
                  <span className="project-open">
                    <ArrowUpRight size={19} />
                  </span>
                </div>
                <div className="project-meta">
                  <span>{project.category}</span>
                  <span>{project.number}</span>
                </div>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </button>
            ))}
          </div>
          <div className="work-foot">
            <span>
              From learning patterns to making everyday life a little better.
            </span>
            <a
              href="https://github.com/serenahuang225"
              target="_blank"
              rel="noreferrer"
            >
              More on GitHub <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="section-whisper">
            “Everyone’s a beginner at some point so don’t let it stop you from
            trying something new.”
          </div>
        </section>
        <section className="writing section-pad" id="values">
          <div className="section-top">
            <span className="eyebrow">02 / VALUES TO LIVE BY</span>
            <span className="quiet">
              Thoughtfull: full of thoughts and thoughtful
            </span>
          </div>
          <div className="writing-layout">
            <div className="writing-intro">
              <h2>
                A few things
                <br />I <em>live by.</em>
              </h2>
              <p>
                A set of axioms I've chosen to meditate, build on,
                <br />
                and bring into my daily life.
              </p>
              <span className="handwritten">mens et manus ↗</span>
            </div>
            <Values />
          </div>
          <div className="section-whisper">“Think freely and openly.”</div>
        </section>
        <section className="photos section-pad" id="photos">
          <div className="section-top">
            <span className="eyebrow">03 / THROUGH MY EYES</span>
            <span className="quiet">
              An invitation to look a little closer.
            </span>
          </div>
          <div className="photo-heading">
            <h2>
              The in-between
              <br />
              <em>is everything.</em>
            </h2>
            <p>
              A place for the things I notice.
              <br />
              Small details. Passing light.
              <br />
              Moments worth keeping.
            </p>
          </div>
          <PhotoGallery onOpen={setPhoto} />
          <div className="section-whisper">
            “As important as it is to embrace yourself, you should still
            recognize that your habits can be shaped by your environment.”
          </div>
        </section>
        <section className="listening section-pad" id="listening">
          <div className="section-top">
            <span className="eyebrow">04 / THE SOUNDTRACK</span>
            <Headphones size={18} />
          </div>
          <MusicPlayer />
          <div className="section-whisper">
            “Optimize your life, which means taking into account time for
            sleep.”
          </div>
        </section>
        <section className="about section-pad" id="about">
          <div className="section-top">
            <span className="eyebrow">05 / THE PERSON BEHIND IT ALL</span>
            <span className="quiet">Still learning. Always becoming.</span>
          </div>
          <div className="about-layout">
            <h2>
              Head in the
              <br />
              possibilities.
              <br />
              <em>Hands in the work.</em>
            </h2>
            <div className="about-copy">
              <p>
                I’m Serena, an MIT student exploring math, ai, and philosophy.
              </p>
              <p>
                I’m drawn to the space where ideas become useful: from diving
                deep into cybersecurity or agentic ai research to building tools
                for swimmers, planners, and everyday life.
              </p>
              <p>
                I care about learning deeply, making things thoughtfully, and
                showing up as myself.
              </p>
              <p>
                Some hobbies include reading great books (always excited for recs),
                gymming, swimming, board/card gaming, and eating (beli: @kingbubbles)
              </p>
              <div className="about-links">
                <a
                  href="https://www.linkedin.com/in/serenahuang225"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn <ArrowUpRight size={15} />
                </a>
                <a
                  href="https://github.com/serenahuang225"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
          </div>
          <Experience />
          <div className="contact-line">
            <span>Good conversations start somewhere.</span>
            <a href="mailto:serenahuang@mit.edu">
              Let’s say hello.
              <ArrowUpRight />
            </a>
          </div>
          <div className="floating-thought">
            <span className="thought-star">✳</span>
            <div>
              <span className="eyebrow">A THOUGHT TO TAKE WITH YOU</span>
              <p aria-live="polite">“{quotes[quote]}”</p>
            </div>
            <button
              aria-label="Next thought"
              onClick={() => setQuote((quote + 1) % quotes.length)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <footer>
            <a className="footer-signature" href="#home">
              Serena Huang<span>↗</span>
            </a>
            <span>BUILT WITH INTENTION. ALWAYS A WORK IN PROGRESS.</span>
            <a href="#home">
              BACK TO THE SURFACE <ArrowUpRight size={13} />
            </a>
          </footer>
        </section>
      </main>
      <button
        className="motion-toggle"
        onClick={() => setStill(!still)}
        aria-pressed={still}
        aria-label={still ? "Enable motion" : "Reduce motion"}
      >
        {still ? <Play size={12} /> : <Pause size={12} />}
        <span>{still ? "Motion off" : "Motion on"}</span>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        aria-labelledby="project-title"
        className="project-dialog"
      >
        {selected && (
          <>
            <button
              className="dialog-close"
              aria-label="Close project"
              onClick={() => dialog.current?.close()}
            >
              <X size={22} />
            </button>
            <ProjectArt kind={selected.slug} />
            <div className="dialog-content">
              <span className="eyebrow">{selected.category}</span>
              <h2 id="project-title">{selected.title}</h2>
              <p>{selected.detail}</p>
              <div className="project-metric">
                <strong>{selected.metric}</strong>
                <span>{selected.metricLabel}</span>
              </div>
              <div className="tags">
                {selected.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <a
                className="text-link"
                href={selected.href}
                target="_blank"
                rel="noreferrer"
              >
                Explore {selected.name}
                <ArrowUpRight size={17} />
              </a>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={photoDialog}
        aria-label="Photograph detail"
        className="photo-dialog"
        onClose={() => setPhoto(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) photoDialog.current?.close();
        }}
      >
        {photo && (
          <>
            <button
              className="dialog-close"
              aria-label="Close photograph"
              onClick={() => photoDialog.current?.close()}
            >
              <X />
            </button>
            <img src={photo.src} alt={photo.alt} />
            <p>
              {photo.caption}
              {photo.location && ` · ${photo.location}`}
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
