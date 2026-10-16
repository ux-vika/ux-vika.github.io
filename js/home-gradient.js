/* Главная: переливающийся градиент на тёмном фоне карточек.
   WebGL-шейдер без библиотек: закрученный волнами градиент, два цвета
   на карточку из data-g="#цвет1 #цвет2". Рисуется в половинном разрешении,
   так как градиент мягкий. Без WebGL или при «уменьшить движение» остаётся
   тёмный фон карточки. */
(function () {
  var canvases = Array.prototype.slice.call(document.querySelectorAll('.card__bg'));
  if (!canvases.length) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 r;uniform float t;uniform vec3 c1;uniform vec3 c2;',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/r;',
    '  vec2 p=(uv-.5)*vec2(r.x/r.y,1.)*2.2;',
    '  for(int i=1;i<4;i++){',
    '    float k=float(i);',
    '    p+=vec2(.55/k*sin(k*p.y*1.6+t*.35+k),.55/k*cos(k*p.x*1.6-t*.30+k*1.7));',
    '  }',
    '  float a=atan(p.y,p.x);',
    '  float sw=.5+.5*sin(a*2.+length(p)*2.4-t*.5);',
    '  float glow=smoothstep(1.7,.0,length(p-vec2(.9,.7)));',
    '  float glow2=smoothstep(1.9,.0,length(p+vec2(.8,.9)));',
    '  vec3 col=vec3(.055);',
    '  col+=mix(c1,c2,sw)*(glow*.75+glow2*.45)*(.55+.45*sin(t*.4+a));',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  function hex(h) {
    h = h.replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; });
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  var items = [];
  canvases.forEach(function (cv) {
    var gl = cv.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var cols = (cv.getAttribute('data-g') || '#6a5cff #c04cff').split(/\s+/);
    gl.uniform3fv(gl.getUniformLocation(prog, 'c1'), hex(cols[0]));
    gl.uniform3fv(gl.getUniformLocation(prog, 'c2'), hex(cols[1] || cols[0]));

    items.push({
      cv: cv, gl: gl,
      r: gl.getUniformLocation(prog, 'r'),
      t: gl.getUniformLocation(prog, 't'),
      seed: items.length * 7.3,
      visible: true
    });
  });
  if (!items.length) return;

  function resize(it) {
    var w = Math.max(2, Math.round(it.cv.clientWidth / 2));
    var h = Math.max(2, Math.round(it.cv.clientHeight / 2));
    if (it.cv.width !== w || it.cv.height !== h) {
      it.cv.width = w;
      it.cv.height = h;
      it.gl.viewport(0, 0, w, h);
    }
  }

  function draw(it, time) {
    resize(it);
    it.gl.uniform2f(it.r, it.cv.width, it.cv.height);
    it.gl.uniform1f(it.t, time + it.seed);
    it.gl.drawArrays(it.gl.TRIANGLES, 0, 3);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].cv === e.target) items[i].visible = e.isIntersecting;
        }
      });
    });
    items.forEach(function (it) { io.observe(it.cv); });
  }

  if (still) {
    items.forEach(function (it) { draw(it, 2); });
    addEventListener('resize', function () { items.forEach(function (it) { draw(it, 2); }); });
    return;
  }

  function frame(ms) {
    var time = ms / 1000;
    items.forEach(function (it) { if (it.visible) draw(it, time); });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
