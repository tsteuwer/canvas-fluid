/***
 * Read all about it:
 * https://mikeash.com/pyblog/fluid-simulation-for-dummies.html
 */
(function() {

	/*********
	 * MATHS *
	 ********/
	var SCALE = 6;

	class Fluid {
		constructor(dt, diffusion, viscocity, N, iterations) {
			this.loop = 0;
			this.size = N;
			this.dt = dt;
			this.diff = diffusion;
			this.visc = viscocity;
			this.iter = iterations;
			
			this.s = new Array(this.size * this.size).fill(0);
			this.density = new Array(this.size * this.size).fill(0);
		
			// Holds current iteration values
			this.Vx = new Array(this.size * this.size).fill(0);
			this.Vy = new Array(this.size * this.size).fill(0);

			// Holds previous iterations values
			this.Vx0 = new Array(this.size * this.size).fill(0);
			this.Vy0 = new Array(this.size * this.size).fill(0);
		}

		addDensity(x, y, amount) {
    	this.density[IX(x, y)] += amount
		}

		addVelcity(x, y, amountX, amountY) {
			const index = IX(x, y);
			this.Vx[index] += amountX;
			this.Vy[index] += amountY;
		}

		step() {
			diffuse(1, this.Vx0, this.Vx, this.visc, this.dt, this.iter, this.size);
	    diffuse(2, this.Vy0, this.Vy, this.visc, this.dt, this.iter, this.size);
	    
	    project(this.Vx0, this.Vy0, this.Vx, this.Vy, this.iter, this.size);
	    
	    advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0,this.dt, this.size);
	    advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, this.dt, this.size);
	    
	    project(this.Vx, this.Vy, this.Vx0, this.Vy0, this.iter, this.size);
	    
	    diffuse(0, this.s, this.density, this.diff, this.dt, this.iter, this.size);
	    advect(0, this.density, this.s, this.Vx, this.Vy, this.dt, this.size);
		}

		render(context) {
			for (let i = 0; i < this.size; i++) {
				for ( let j = 0; j < this.size; j++) {
					let index = IX(i, j);
					const d = this.density[index];
					context.fillStyle = `rgba(255, 255, 255, ${d})`;
					context.fillRect(i * SCALE, j * SCALE, 1 * SCALE, 1 * SCALE);
				}
			}
		}
	}

	function diffuse(b, x, x0, diff, dt, iter, N) {
		let a = dt * diff * (N - 2) * (N - 2);
		lin_solve(b, x, x0, a, 1 + 6 * a, iter, N);
	}

	function lin_solve(b, x, x0, a, c, iter, N) {
		let cRecip = 1.0 / c;
		for (let t = 0; t < iter; t++) {
			for (let j = 1; j < N - 1; j++) {
				for (let i = 1; i < N - 1; i++) {
					x[IX(i, j)] =
						(x0[IX(i, j)] +
							a *
								(x[IX(i + 1, j)] +
									x[IX(i - 1, j)] +
									x[IX(i, j + 1)] +
									x[IX(i, j - 1)])) *
							cRecip;
				}
			}
			set_bnd(b, x, N);
		}
	}

	function set_bnd(b, x, N) {
		for (let i = 1; i < N - 1; i++) {
			x[IX(i, 0)] = b == 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
			x[IX(i, N - 1)] = b == 2 ? -x[IX(i, N - 2)] : x[IX(i, N - 2)];
		}
		for (let j = 1; j < N - 1; j++) {
			x[IX(0, j)] = b == 1 ? -x[IX(1, j)] : x[IX(1, j)];
			x[IX(N - 1, j)] = b == 1 ? -x[IX(N - 2, j)] : x[IX(N - 2, j)];
		}
	
		x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
		x[IX(0, N - 1)] = 0.5 * (x[IX(1, N - 1)] + x[IX(0, N - 2)]);
		x[IX(N - 1, 0)] = 0.5 * (x[IX(N - 2, 0)] + x[IX(N - 1, 1)]);
		x[IX(N - 1, N - 1)] = 0.5 * (x[IX(N - 2, N - 1)] + x[IX(N - 1, N - 2)]);
	}

	function project(velocX, velocY, p, div, iter, N) {
		for (let j = 1; j < N - 1; j++) {
			for (let i = 1; i < N - 1; i++) {
				div[IX(i, j)] =
					(-0.5 *
						(velocX[IX(i + 1, j)] -
							velocX[IX(i - 1, j)] +
							velocY[IX(i, j + 1)] -
							velocY[IX(i, j - 1)])) /
					N;
				p[IX(i, j)] = 0;
			}
		}
	
		set_bnd(0, div, N);
		set_bnd(0, p, N);
		lin_solve(0, p, div, 1, 6, iter, N);
	
		for (let j = 1; j < N - 1; j++) {
			for (let i = 1; i < N - 1; i++) {
				velocX[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)]) * N;
				velocY[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)]) * N;
			}
		}
	
		set_bnd(1, velocX, N);
		set_bnd(2, velocY, N);
	}

	function advect(b, d, d0, velocX, velocY, dt, N) {
		let i0, i1, j0, j1;
	
		let dtx = dt * (N - 2);
		let dty = dt * (N - 2);
	
		let s0, s1, t0, t1;
		let tmp1, tmp2, x, y;
	
		let Nfloat = N;
		let ifloat, jfloat;
		let i, j;
	
		for (j = 1, jfloat = 1; j < N - 1; j++, jfloat++) {
			for (i = 1, ifloat = 1; i < N - 1; i++, ifloat++) {
				let index = IX(i, j);
				tmp1 = dtx * velocX[index];
				tmp2 = dty * velocY[index];
				x = ifloat - tmp1;
				y = jfloat - tmp2;
	
				if (x < 0.5) x = 0.5;
				if (x > Nfloat + 0.5) x = Nfloat + 0.5;
				i0 = Math.floor(x);
				i1 = i0 + 1.0;
				if (y < 0.5) y = 0.5;
				if (y > Nfloat + 0.5) y = Nfloat + 0.5;
				j0 = Math.floor(y);
				j1 = j0 + 1.0;

				if (i1 > N) {
					i1 = N;
				}

				if (i0 > N) {
					i0 = N
				}

				if (j1 > N) {
					j1 = N;
				}

				if (j0 > N) {
					j0 = N;
				}
	
				s1 = x - i0;
				s0 = 1.0 - s1;
				t1 = y - j0;
				t0 = 1.0 - t1;

	
				let i0i = parseInt(i0);
				let i1i = parseInt(i1);
				let j0i = parseInt(j0);
				let j1i = parseInt(j1);

				if (i0i >= N) {
					i0i = N - 1;
				}

				if (i1i >= N) {
					i1i = N - 1;
				}

				if (j0i >= N) {
					j0i = N - 1;
				}
				if (j1i >= N) {
					j1i = N - 1;
				}

				d[IX(i, j)] =
					s0 * (t0 * d0[IX(i0i, j0i)] + t1 * d0[IX(i0i, j1i)]) +
					s1 * (t0 * d0[IX(i1i, j0i)] + t1 * d0[IX(i1i, j1i)]);
			}
		}
	
		set_bnd(b, d, N);
	}
	

	/**
	 * Returns the index of the cell we want.
	 * @param {Number} x Integer
	 * @param {Number} y Integer
	 * @returns {Number} The index to use
	 */
	function IX(x, y) {
		return x + y * N;	
	}



	/***** PUT IT ALL TOGETHER *****/
	const canvas = document.getElementById('canvas');
	const ctx = canvas.getContext('2d');
	const N = 60;
	canvas.width = N * SCALE;
	canvas.height = N * SCALE;
	ctx.beginPath();
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, N * SCALE, N * SCALE);

	console.warn('Starting...');

	const fluid = new Fluid(0.1, 0, 0, N, 4);
	let lastMouseX = 0;
	let lastMouseY = 0;
	canvas.addEventListener('mousedown', () => {
		canvas.addEventListener('mousemove', moveListener)
	});
	canvas.addEventListener('mouseup', () => {
		canvas.removeEventListener('mousemove', moveListener);
	});

	function getMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		return {
			x: Math.floor((evt.clientX - rect.left) / SCALE),
			y: Math.floor((evt.clientY - rect.top) / SCALE)
		};
	}

	function moveListener(e) {
		const {x, y} = getMousePos(canvas, e);
		fluid.addDensity(x, y, 2);
		fluid.addVelcity(x, y, x - lastMouseX, y - lastMouseY);
		lastMouseX = x;
		lastMouseY = y;
	}

	requestAnimationFrame(function run() {
		fluid.step();
		fluid.render(ctx);
		requestAnimationFrame(run);
	});
})();