"use strict"

const CELL_SIZE = 20;
const CELL_LIFE = 100; // in millis

class Game {
    constructor(app, ctx) {
        this.app = app;
        this.ctx = ctx;
        this.rows = 0;
        this.columns = 0;
        this.state = [];
        this.runnable = undefined // No clue if this is cool in js
        this.running = false;

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

        console.log('[CELLULAR] Simulation ran.')
    }

    stop() {
        if (!this.running) {
            console.log('[CELLULAR] Game is not running.');
            return;
        }

        clearInterval(this.runnable);
        this.running = false;

        console.log('[CELLULAR] Simulation stopped.')
    }

    countIfAlive(x, y) {
        if (x < 0 || x >= this.rows || y < 0 || y >= this.columns) {
            return 0;
        }

        return this.state[x][y] ? 1 : 0; // TODO: does it work with this.state[x][y] only?
    }

    countNeighbours(x, y) {
        return this.countIfAlive(x - 1, y - 1)
            + this.countIfAlive(x, y - 1)
            + this.countIfAlive(x + 1, y - 1)
            + this.countIfAlive(x - 1, y)
            + this.countIfAlive(x + 1, y)
            + this.countIfAlive(x - 1, y + 1)
            + this.countIfAlive(x, y + 1)
            + this.countIfAlive(x + 1, y + 1);
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
    }

    click(event) {
        let x = Math.floor(event.offsetX / CELL_SIZE);
        let y = Math.floor(event.offsetY / CELL_SIZE);
        if (x < 0 || x >= this.rows || y < 0 || y >= this.columns) {
            return;
        }

        this.state[x][y] = !this.state[x][y];
        this.render();
    }

    render() {
        for (let y = 0; y < this.columns; ++y) {
            for (let x = 0; x < this.rows; ++x) {
                let cellX = x * CELL_SIZE;
                let cellY = y * CELL_SIZE;

                if (this.state[x][y]) {
                    this.ctx.fillStyle = 'white';
                } else {
                    this.ctx.fillStyle = this.ctx.createLinearGradient(0, 0, this.ctx.canvas.width, 0);
                    this.ctx.fillStyle.addColorStop(0, '#d53a9d');
                    this.ctx.fillStyle.addColorStop(1, '#743ad5');
                }
                this.ctx.fillRect(cellX, cellY, cellX + CELL_SIZE, cellY + CELL_SIZE);
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
        if (event.code !== "Space") {
            return;
        }

        if (game.running) {
            game.stop();
        } else {
            game.run();
        }
    });

    window.addEventListener('resize', (event) => {
        resize(game);
    });
};

main();
