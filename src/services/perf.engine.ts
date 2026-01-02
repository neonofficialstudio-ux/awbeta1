
export const Perf = {
    marks: {} as Record<string, number>,
    counts: {} as Record<string, number>,
    fpsInterval: null as any,
    frameCount: 0,
    lastTime: 0,
    currentFps: 0,

    // --- Time Measurement ---
    mark(label: string) {
        this.marks[label] = performance.now();
    },

    end(label: string) {
        if (!this.marks[label]) return 0;
        const delta = performance.now() - this.marks[label];
        // Only log significant delays or specific tracking
        if (delta > 16 || label.includes('mount') || label.includes('fetch')) {
             console.debug(`[PERF] ${label}: ${delta.toFixed(2)}ms`);
        }
        delete this.marks[label];
        return delta;
    },

    // --- Render Counting ---
    trackRender(componentName: string) {
        this.counts[componentName] = (this.counts[componentName] || 0) + 1;
        if (this.counts[componentName] > 10 && this.counts[componentName] % 10 === 0) {
            console.warn(`[PERF] High render count for ${componentName}: ${this.counts[componentName]}`);
        }
    },

    // --- FPS Monitor ---
    startFPS() {
        if (this.fpsInterval) return;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        const loop = () => {
            const now = performance.now();
            this.frameCount++;
            
            if (now >= this.lastTime + 1000) {
                this.currentFps = this.frameCount;
                this.frameCount = 0;
                this.lastTime = now;
                if (this.currentFps < 30) {
                    console.warn(`[PERF] Low FPS detected: ${this.currentFps}`);
                }
            }
            this.fpsInterval = requestAnimationFrame(loop);
        };
        this.fpsInterval = requestAnimationFrame(loop);
    },

    stopFPS() {
        if (this.fpsInterval) {
            cancelAnimationFrame(this.fpsInterval);
            this.fpsInterval = null;
        }
    },

    // --- Global Exposure ---
    initMonitor() {
        if (typeof window !== 'undefined') {
            (window as any).__AW_MONITOR__ = {
                getRenderCount: (name: string) => this.counts[name] || 0,
                getPerf: (label: string) => console.table(this.marks),
                resetCounts: () => { this.counts = {}; console.log("Render counts reset."); }
            };

            (window as any).__AW_FPS__ = {
                start: () => this.startFPS(),
                stop: () => this.stopFPS(),
                get: () => this.currentFps
            };
            
            // Start FPS monitoring automatically in dev/test modes
            this.startFPS();
        }
    }
};

// Initialize immediately
Perf.initMonitor();
