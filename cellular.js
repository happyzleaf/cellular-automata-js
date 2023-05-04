"use strict"

const CELL_SIZE = 15;
const CELL_LIFE = 100; // in millis

const BG_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--bg');
const FG_LEFT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--fg-left');
const FG_RIGHT_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--fg-right');

// Rainbow
// const COLORS = ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'];

// Blue-green scale
const COLORS = ['#423ED9', '#4274DD', '#46AEE0', '#4AE3DF', '#4EE7AD', '#53EA7C'];
const COLOR_MASK = Math.floor(256 / COLORS.length).toString(16).padStart(2, '0');

class Game {
    constructor(app, ctx) {
        this.app = app;
        this.ctx = ctx;
        this.rows = 0;
        this.columns = 0;
        this.state = [];
        this.runnable = undefined // No clue if this is cool in js
        this.running = false;
        this.colorIndex = 0;

        this.ctx.canvas.addEventListener('click', (e) => this.click(e));
    }

    resize(rows, columns) {
        let state = [];
        for (let x = 0; x < rows; ++x) {
            let line = [];
            for (let y = 0; y < columns; ++y) {
                if (x >= this.rows || y >= this.columns) {
                    line.push(false);
                } else {
                    line.push(this.state[x][y]);
                }
            }
            state.push(line);
        }
        this.state = state;

        this.rows = rows;
        this.columns = columns;
        this.app.width = CELL_SIZE * this.rows;
        this.app.height = CELL_SIZE * this.columns;

        this.clear();
        this.render();
    }

    run() {
        if (this.running) {
            console.log('[CELLULAR] Game is already running.');
            return;
        }

        this.step();
        this.runnable = setInterval(() => this.step(), CELL_LIFE);
        this.running = true;

        console.log('[CELLULAR] Simulation ran.');
    }

    stop() {
        if (!this.running) {
            console.log('[CELLULAR] Game is not running.');
            return;
        }

        clearInterval(this.runnable);
        this.running = false;

        console.log('[CELLULAR] Simulation stopped.');
    }

    countIfAlive(x, y) {
        if (x < 0 || x >= this.rows || y < 0 || y >= this.columns) {
            return 0;
        }

        return this.state[x][y] ? 1 : 0; // TODO: does it work with this.state[x][y] only?
    }

    countNeighbours(cellX, cellY) {
        let count = 0;

        for (let x = cellX - 1; x <= cellX + 1; ++x) {
            if (x < 0 || x >= this.rows) {
                continue;
            }

            for (let y = cellY - 1; y <= cellY + 1; ++y) {
                if ((x == cellX && y == cellY) || y < 0 || y >= this.columns) {
                    continue;
                }

                if (this.state[x][y] && ++count > 3) {
                    return 4;
                }
            }
        }

        return count;
    }

    step() {
        let state = [];
        for (let x = 0; x < this.rows; ++x) {
            let line = [];
            for (let y = 0; y < this.columns; ++y) {
                let neighbours = this.countNeighbours(x, y);
                if (this.state[x][y]) {
                    line.push(neighbours == 2 || neighbours == 3);
                } else {
                    line.push(neighbours == 3);
                }
            }
            state.push(line);
        }

        this.state = state;
        this.render();

        if (++this.colorIndex >= COLORS.length) {
            this.colorIndex = 0;
        }
    }

    click(event) {
        let x = Math.floor(event.offsetX / CELL_SIZE);
        let y = Math.floor(event.offsetY / CELL_SIZE);
        if (x < 0 || x >= this.rows || y < 0 || y >= this.columns) {
            return;
        }

        this.state[x][y] = !this.state[x][y];
        if (this.state[x][y]) {
            this.ctx.fillStyle = COLORS[this.colorIndex];
        } else {
            this.ctx.fillStyle = this.ctx.createLinearGradient(0, 0, this.ctx.canvas.width, 0);
            this.ctx.fillStyle.addColorStop(0, FG_LEFT_COLOR);
            this.ctx.fillStyle.addColorStop(1, FG_RIGHT_COLOR);
        }
        this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    clear(alpha) {
        if (typeof alpha === 'undefined') {
            alpha = 'ff';
        }

        this.ctx.fillStyle = this.ctx.createLinearGradient(0, 0, this.ctx.canvas.width, 0);
        this.ctx.fillStyle.addColorStop(0, FG_LEFT_COLOR + alpha);
        this.ctx.fillStyle.addColorStop(1, FG_RIGHT_COLOR + alpha);
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    render() {
        this.clear(COLOR_MASK);

        for (let y = 0; y < this.columns; ++y) {
            for (let x = 0; x < this.rows; ++x) {
                if (this.state[x][y]) {
                    this.ctx.fillStyle = COLORS[this.colorIndex];
                    this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }
}

let resize = (game) => {
    game.resize(Math.floor(window.innerWidth * 0.8 / CELL_SIZE), Math.floor(window.innerHeight * 0.8 / CELL_SIZE));
};

let main = () => {
    let app = document.getElementById('app');
    let ctx = app.getContext('2d');

    let game = new Game(app, ctx);
    resize(game);

    document.addEventListener('keyup', (event) => {
        if (event.code === "Space") {
            if (game.running) {
                game.stop();
            } else {
                game.run();
            }
        } else if (event.code === "KeyS") {
            game.step();
            console.log('[CELLULAR] Step taken.');
        }
    });

    window.addEventListener('resize', (event) => {
        resize(game);
    });
};

main();
