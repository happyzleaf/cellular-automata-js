"use strict"

const CELL_SIZE = 15;
const CELL_LIFE = 100; // in millis
const CHUNK_SIZE = 32; // cells per chunk

const BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--bg');
const ACCENT_LEFT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--accent-left');
const ACCENT_RIGHT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--accent-right');

// Rainbow
// const COLORS = ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'];

// Blue-green scale
const COLORS = ['#423ED9', '#4274DD', '#46AEE0', '#4AE3DF', '#4EE7AD', '#53EA7C'];
const COLOR_MASK = Math.floor(256 / COLORS.length).toString(16).padStart(2, '0');

const vec2 = (x, y) => new Vec2(x, y);
const vec2unpack = (k) => vec2(
    Number(BigInt.asIntN(32, k >> 32n)),
    Number(BigInt.asIntN(32, k & ((1n << 32n) - 1n)))
);
class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(a, b) {
        if (a instanceof Vec2) {
            return vec2(this.x + a.x, this.y + a.y);
        }
        if (typeof a === 'number') {
            return vec2(this.x + a, this.y + (b ?? a));
        }
        throw new Error(`unrecognized type of ${a}`);
    }

    sub(a, b) {
        if (a instanceof Vec2) {
            return vec2(this.x - a.x, this.y - a.y);
        }
        if (typeof a === 'number') {
            return vec2(this.x - a, this.y - (b ?? a));
        }
        throw new Error(`unrecognized type of ${a}`);
    }

    mul(a, b) {
        if (a instanceof Vec2) {
            return vec2(this.x * a.x, this.y * a.y);
        }
        if (typeof a === 'number') {
            return vec2(this.x * a, this.y * (b ?? a));
        }
        throw new Error(`unrecognized type of ${a}`);
    }

    div(a, b) {
        if (a instanceof Vec2) {
            return vec2(this.x / a.x, this.y / a.y);
        }
        if (typeof a === 'number') {
            return vec2(this.x / a, this.y / (b ?? a));
        }
        throw new Error(`unrecognized type of ${a}`);
    }

    map(a, b) {
        a = a ?? (p => p);
        b = b ?? a;
        return vec2(a(this.x), b(this.y));
    }

    pack() {
        const X = BigInt.asUintN(32, BigInt(this.x));
        const Y = BigInt.asUintN(32, BigInt(this.y));
        return (X << 32n) | Y;
    }
}

const REG_REMOVE_WHITESPACE = /\s*/g;
const REG_GET_XY = /^x=(\d+),y=(\d+).*$/i;
const REG_GET_VALUE = /(\d*)([bo])/gi;
class Structure {
    constructor(str) {
        this.success = false;

        let lines = str
            .split('\n') // Split into single lines
            .map((line) => line.replace(REG_REMOVE_WHITESPACE, '')) // Remove all whitespaces
            .filter((line) => line && !line.startsWith('#')); // Filter empty and comment lines

        if (lines.length < 1) return;
        [this.columns, this.rows] = REG_GET_XY.exec(lines[0]).slice(1);

        this.state = [];
        for (let line of lines.slice(1)) {
            for (let row of line.split('$')) {
                this.state.push(this.parseRow(row, this.columns));
            }

            if (line.endsWith('!')) {
                break;
            }
        }

        // for (let x = 0; x < this.rows; ++x) {
        //     let toPrint = ''
        //     for (let y = 0; y < this.columns; ++y) {
        //         toPrint += this.state[x][y] ? 'x' : '_';
        //     }
        //     console.log(toPrint);
        // }

        this.success = true;
    }

    parseRow(line, length) {
        let row = [];

        let values;
        while ((values = REG_GET_VALUE.exec(line)) !== null) {
            let [amount, state] = values.splice(1);
            if (!amount) {
                amount = 1;
            }

            for (let y = 0; y < amount; ++y) {
                row.push(state === 'o');
            }
        }

        // Fill remaining cells
        for (let y = row.length; y < length; ++y) {
            row.push(false);
        }

        return row;
    }
}

class Camera {
    constructor(app) {
        this.app = app;
        this.rows = 0; // Visible rows
        this.columns = 0; // Visible columns
        this.origin = vec2(); // Camera offset in cells
    }

    resize() {
        this.rows = Math.floor(this.app.clientWidth / CELL_SIZE);
        this.columns = Math.floor(this.app.clientHeight / CELL_SIZE);
        this.app.width = CELL_SIZE * this.rows;
        this.app.height = CELL_SIZE * this.columns;
    }
}

class Chunk {
    constructor(cells) {
        this.cells = cells || Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(false));

        this.count = 0;
        for (const line of this.cells) {
            for (const cell of line) {
                if (cell) ++this.count;
            }
        }
    }

    get(cell) {
        return this.cells[cell.x][cell.y];
    }

    set(cell, alive) {
        const wasAlive = this.cells[cell.x][cell.y];
        this.cells[cell.x][cell.y] = alive;
        if (wasAlive && !alive) --this.count;
        else if (!wasAlive && alive) ++this.count;
    }
}

class Game {
    constructor(app, ctx, playback) {
        this.app = app;
        this.ctx = ctx;
        this.playback = playback;
        this.camera = new Camera(app);
        this.chunks = new Map(); // key => chunk with CHUNK_SIZE x CHUNK_SIZE cells
        this.running = null;
        this.colorIndex = 0;
    }

    getChunk(key, create = false) {
        let chunk = this.chunks.get(key);
        if (!chunk && create) {
            chunk = new Chunk();
            this.chunks.set(key, chunk);
        }

        return chunk;
    }

    getCell(worldPosition) {
        const chunkPosition = worldPosition.div(CHUNK_SIZE).map(Math.floor)
        const chunk = this.getChunk(chunkPosition.pack());
        if (!chunk) return false;

        const cellPosition = worldPosition.sub(chunkPosition.mul(CHUNK_SIZE))
        return chunk.get(cellPosition);
    }

    setCell(worldPosition, alive) {
        const chunkPosition = worldPosition.div(CHUNK_SIZE).map(Math.floor);
        const chunk = this.getChunk(chunkPosition.pack(), alive);
        if (!chunk) return;

        const cellPosition = worldPosition.sub(chunkPosition.mul(CHUNK_SIZE));
        chunk.set(cellPosition, alive);
        if (!alive && !chunk.count) {
            const chunkKey = chunkPosition.pack();
            this.chunks.delete(chunkKey);
        }
    }

    run() {
        if (this.running) {
            console.log('[CELLULAR] Game is already running.');
            return;
        }

        this.step();
        this.running = setInterval(() => this.step(), CELL_LIFE);
        this.playback.dataset.playing = ''

        console.log('[CELLULAR] Simulation ran.');
    }

    stop() {
        if (!this.running) {
            console.log('[CELLULAR] Game is not running.');
            return;
        }

        clearInterval(this.running);
        this.running = null;
        delete this.playback.dataset.playing;

        console.log('[CELLULAR] Simulation stopped.');
    }

    toggle() {
        if (this.running) {
            this.stop();
        } else {
            this.run();
        }
    }

    process() {
        const DSQUARE = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],  [0, 0],  [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        const DSQUAREHOLLOW = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        const chunks = new Map();
        const seen = new Set();

        for (const ck of this.chunks.keys()) {
            const cp = vec2unpack(ck);
            for (const [cdx, cdy] of DSQUARE) {
                const ncp = cp.add(cdx, cdy);
                const nck = ncp.pack();

                if (seen.has(nck)) continue;
                seen.add(nck);

                const cells = Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(false));
                let survived = false;

                const origin = ncp.mul(CHUNK_SIZE); // this neighbor chunk origin

                // for each cell
                for (let x = 0; x < CHUNK_SIZE; ++x) {
                    for (let y = 0; y < CHUNK_SIZE; ++y) {
                        // count alive neighbors
                        let n = 0;
                        for (const [dx, dy] of DSQUAREHOLLOW) {
                            if (!this.getCell(origin.add(x + dx, y + dy))) continue;
                            if (++n > 3) break;
                        }

                        const wasAlive = this.getCell(origin.add(x, y));
                        const willLive = wasAlive ? (n === 2 || n === 3) : n === 3;
                        cells[x][y] = willLive;
                        if (willLive) survived = true;
                    }
                }

                if (survived) chunks.set(nck, new Chunk(cells));
            }
        }

        return chunks;
    }

    step() {
        this.chunks = this.process();
        this.render();

        if (++this.colorIndex >= COLORS.length) {
            this.colorIndex = 0;
        }
    }

    clear(alpha = 'ff') {
        this.ctx.fillStyle = this.ctx.createLinearGradient(0, 0, this.ctx.canvas.width, 0);
        this.ctx.fillStyle.addColorStop(0, ACCENT_LEFT_COLOR + alpha);
        this.ctx.fillStyle.addColorStop(1, ACCENT_RIGHT_COLOR + alpha);
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    render() {
        this.clear(COLOR_MASK);

        for (let cameraX = 0; cameraX < this.camera.rows; ++cameraX) {
            for (let cameraY = 0; cameraY < this.camera.columns; ++cameraY) {
                const worldPosition = this.camera.origin.add(cameraX, cameraY);
                const cell = this.getCell(worldPosition);
                if (!cell) continue;

                this.ctx.fillStyle = COLORS[this.colorIndex];
                this.ctx.fillRect(cameraX * CELL_SIZE, cameraY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

const Input = {
    game: null,
    canvas: null,
    camera: null,
    playback: null,

    dragging: false,
    moved: false,
    origin: vec2(),
    cameraOrigin: vec2(),

    setup(game) {
        Input.game = game;
        Input.canvas = game.ctx.canvas;
        Input.camera = game.camera;
        Input.playback = game.playback;

        document.addEventListener('keyup', Input.keyUp);
        Input.playback.addEventListener('click', () => Input.game.toggle());

        Input.canvas.addEventListener('mousedown', Input.dragStart);
        Input.canvas.addEventListener('touchstart', Input.dragStart, { passive: false });
        Input.canvas.addEventListener('mousemove', Input.drag);
        Input.canvas.addEventListener('touchmove', Input.drag, { passive: false });
        Input.canvas.addEventListener('mouseup', Input.dragEnd);
        Input.canvas.addEventListener('touchend', Input.dragEnd);
        Input.canvas.addEventListener('mouseleave', Input.dragEnd);
        Input.canvas.addEventListener('touchcancel', Input.dragEnd);
    },

    getEventPosition(event) {
        const rect = Input.canvas.getBoundingClientRect();
        let clientX, clientY;
        if (event.touches && event.touches.length) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        return vec2(clientX - rect.left, clientY - rect.top);
    },

    keyUp(event) {
        if (event.code === 'Space') {
            Input.game.toggle();
        } else if (event.code === 'KeyS') {
            Input.game.step();
            console.log('[CELLULAR] Step taken.');
        }
    },

    click(event) {
        const cell = Input.getEventPosition(event).div(CELL_SIZE).map(Math.floor).add(Input.camera.origin);
        Input.game.setCell(cell, !Input.game.getCell(cell));
        Input.game.render();
    },

    dragStart(event) {
        event.preventDefault();
        Input.dragging = true;
        Input.moved = false;
        Input.origin = Input.getEventPosition(event);
        Input.cameraOrigin = Input.camera.origin;
    },

    drag(event) {
        if (!Input.dragging) return;
        event.preventDefault();

        const dp = Input.getEventPosition(event).sub(Input.origin);
        if (Math.abs(dp.x) > 2 || Math.abs(dp.y) > 2) Input.moved = true;
        Input.camera.origin = Input.cameraOrigin.sub(dp.div(CELL_SIZE).map(Math.floor));
        Input.game.render();
    },
    
    dragEnd(event) {
        if (!Input.dragging) return;
        event.preventDefault();

        Input.dragging = false;
        if (!Input.moved && event.type !== 'mouseleave' && event.type !== 'touchcancel') {
            Input.click(event);
        }
    },
}

const resize = (game) => {
    game.camera.resize();
    game.clear();
    game.render();
};

const main = () => {
    const app = document.getElementById('app');
    const ctx = app.getContext('2d');
    const playback = document.getElementById('playback');

    const game = new Game(app, ctx, playback);
    resize(game);
    window.addEventListener('resize', () => resize(game));
    Input.setup(game);

    // new Structure(`
    //     #C This is a glider.
    //     x = 3, y = 3
    //     bo$2bo$3o!
    // `);
    // new Structure(`
    //     #N Gosper glider gun
    //     #C This was the first gun discovered.
    //     #C As its name suggests, it was discovered by Bill Gosper.
    //     x = 36, y = 9, rule = B3/S23
    //     24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4b
    //     obo$10bo5bo7bo$11bo3bo$12b2o!    
    // `);
};

window.addEventListener('DOMContentLoaded', main);
