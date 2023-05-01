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

    draw(x, y, width, height, cell) {
        if (cell) {
            this.ctx.fillStyle = 'white';
        } else {
            this.ctx.fillStyle = this.ctx.createLinearGradient(0, 0, this.ctx.canvas.width, 0);
            this.ctx.fillStyle.addColorStop(0, '#d53a9d');
            this.ctx.fillStyle.addColorStop(1, '#743ad5');
        }

        this.ctx.fillRect(x, y, x + width, y + height);
    }

    render() {
        this.draw(0, 0, this.ctx.canvas.width, this.ctx.canvas.height, false);

        for (let y = 0; y < this.columns; ++y) {
            for (let x = 0; x < this.rows; ++x) {
                this.draw(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE, this.state[x][y]);
            }
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
        let x = Math.floor(event.offsetX / (this.ctx.canvas.width));
        let y = event.offsetY;
        console.log('Clicked [' + x + ', ' + y + ']');
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
    setInterval(() => {
        game.calculate();
        game.render();
    }, 3000);
};

main();
