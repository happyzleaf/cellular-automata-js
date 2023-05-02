"use strict"

const CELL_SIZE = 20;

class Game {
    constructor(app, ctx, rows, columns) {
        this.app = app;
        this.ctx = ctx;
        this.ctx.canvas.addEventListener('click', (e) => this.click(e));

        this.rows = rows;
        this.columns = columns;

        this.state = [];
        for (let x = 0; x < this.rows; ++x) {
            let columns = [];
            for (let y = 0; y < this.columns; ++y) {
                columns.push(false);
            }
            this.state.push(columns);
        }
    }

    calculate() {
        this.state = [];
        for (let x = 0; x < this.rows; ++x) {
            let columns = [];
            for (let y = 0; y < this.columns; ++y) {
                columns.push(Math.random() < 0.1);
            }
            this.state.push(columns);
        }
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

let main = () => {
    let app = document.getElementById('app');
    let ctx = app.getContext('2d');

    let w = window.innerWidth * 0.8;
    let h = window.innerHeight * 0.8;
    let rows = Math.floor(w / CELL_SIZE);
    let columns = Math.floor(h / CELL_SIZE);

    app.width = w;
    app.height = h;
    let game = new Game(app, ctx, rows, columns);

    game.calculate();
    game.render();
    // setInterval(() => {
    // game.calculate();
    // game.render();
    // }, 3000);
};

main();
