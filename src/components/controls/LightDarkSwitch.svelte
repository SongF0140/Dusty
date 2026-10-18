<script lang="ts">
import { onMount, tick } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { DARK_MODE, LIGHT_MODE } from "@/constants/constants";
import { getStoredTheme, setTheme } from "@/utils/setting-utils";
import { showPageSkeleton, hidePageSkeleton } from "@/utils/page-loading";
import { transitionTheme, themeTransitionTiming } from "@/utils/theme-transition";
import { coverThemePage, waitForThemePage } from "@/utils/theme-page-loading";

let dark = $state(false);
let switching = $state(false);
let iconHidden = $state(false); // Only the glyph animates; the page palette changes afterward.
let removeCover = () => {};

onMount(() => {
	dark = getStoredTheme() === DARK_MODE;
	const syncTheme = () => { dark = document.documentElement.classList.contains("dark"); };
	window.addEventListener("theme-change", syncTheme);
	return () => {
		window.removeEventListener("theme-change", syncTheme);
		removeCover();
		hidePageSkeleton("theme");
	};
});

async function toggleTheme() {
	if (switching) return;
	const nextDark = !dark;
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	switching = true;
	iconHidden = true;
	try {
		if (!reducedMotion) showPageSkeleton(location.href, "theme");
		if (!reducedMotion) removeCover = coverThemePage();
		await transitionTheme(() => {
			dark = nextDark;
			iconHidden = false;
		}, async () => {
			// Apply every component's palette behind a single cover, then wait for readiness.
			document.documentElement.classList.add("theme-apply");
			setTheme(nextDark ? DARK_MODE : LIGHT_MODE);
			await tick();
			await waitForThemePage();
		}, reducedMotion);
	} finally {
		iconHidden = false;
		hidePageSkeleton("theme");
		removeCover();
		// Reveal everything in the same frame; no component-by-component fade-in.
		requestAnimationFrame(() => document.documentElement.classList.remove("theme-apply"));
		switching = false;
	}
}
</script>

<button
    id="scheme-switch"
    class="theme-toggle btn-plain rounded-lg"
    style={`--glyph-exit: ${themeTransitionTiming.exit}ms; --glyph-enter: ${themeTransitionTiming.enter}ms`}
    role="switch"
    aria-checked={dark}
    aria-label="夜间模式"
    aria-busy={switching}
    disabled={switching}
    title={dark ? "切换到日间模式" : "切换到夜间模式"}
    onclick={toggleTheme}
>
    <span class="theme-glyph" class:is-current={!dark && !iconHidden} aria-hidden="true">
        <Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.25rem]" />
    </span>
    <span class="theme-glyph" class:is-current={dark && !iconHidden} aria-hidden="true">
        <Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.25rem]" />
    </span>
</button>

<style>
    .theme-toggle {
        position: relative;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        color: var(--retro-ink);
        cursor: pointer;
    }
    .theme-toggle:disabled { cursor: wait; }
    .theme-glyph {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        filter: blur(4px);
        transform: scale(0.55);
        transition: opacity var(--glyph-exit) ease-in-out, filter var(--glyph-exit) ease-in-out, transform var(--glyph-exit) cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
    }
    .theme-glyph.is-current {
        opacity: 1; filter: blur(0); transform: scale(1);
        transition-duration: var(--glyph-enter);
    }
    @media (prefers-reduced-motion: reduce) { .theme-glyph { transition: none; } }
</style>
