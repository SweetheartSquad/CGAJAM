precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform float uTime;

uniform vec2 uScreenSize;
uniform vec2 uBufferSize;


const float on = 1.0;
const float off = 85.0/255.0;
const vec3 cyan = vec3(off, on, on);
const vec3 magenta = vec3(on, off, on);
const vec3 white = vec3(on, on, on);

const vec3 red = vec3(on, off, off);
const vec3 green = vec3(off, on, off);
const vec3 yellow = vec3(on, on, off);

uniform float palette; // 0 -> 1 == CGA1 -> CGA1
float brightness = 0.75; // overall brightness threshold

// amount of black around palette edges 
// higher = more black, zero = allow flat blocks of colour
// (depending on brightness, reasonable range is 0.0 -> 0.3)
float edgeGranularity = 0.00;

// glsl rand one-liner
// https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// converts from rgb -> cga
// the components of rgb are the amount of the
// three non-black palette colours to mix in
vec3 cga(vec3 _col) {
    vec3 res = vec3(0.0);
    res.rgb += _col.r * mix(yellow,white,palette);
    res.rgb += _col.g * mix(red,magenta,palette);
    res.rgb += _col.b * mix(green,cyan,palette);
    return res;
}

// HACK: step in maxComponent needs a bit of an offset
const float EPSILON = 0.0000001;
// zeroes out the non-max components of a vector
// e.g. (0.5,0.3,0.7) -> (0.0,0.0,0.7)
vec3 maxComponent (vec3 _col) {
    vec3 res = _col;
    res.b = step(max(_col.r, _col.g), _col.b-EPSILON - edgeGranularity) * _col.b;
    res.r = step(max(_col.g, _col.b), _col.r-EPSILON - edgeGranularity) * _col.r;
    res.g = step(max(_col.r, _col.b), _col.g-EPSILON - edgeGranularity) * _col.g;
    return res;
}

const int MAX_ITERATIONS = 4;
// layered power-of-2 square noise
vec3 noise(const vec3 _col, const vec2 _uv, const int _level) {
    vec3 col = _col;
    vec2 uv = _uv;
    vec2 st = pow(2.0,5.0)*uv;
    float time = uTime;
    float r1 = floor(time*4.0+rand(st-mod(st,1.0)));
    float r2 = 1.0;
    float r3 = floor(time*8.0+rand(st-mod(st,1.0)));
    for (int i = 1; i <= MAX_ITERATIONS; ++i) {
        uv -= mod(uv,pow(2.0,float(i))/uBufferSize.xy);
        col += vec3(
            rand(vec2(uv.x,uv.y) + vec2(r1)),
            rand(vec2(uv.x,uv.y) + vec2(r2)),
            rand(vec2(uv.x,uv.y) + vec2(r3))
        );
    }
    return col;
}


vec3 invert(vec3 _col) {
    return vec3(1.0) - _col;
}

void main(void){
    vec2 uv = vTextureCoord.xy;
    
    // get colour
    vec3 col = texture2D(uSampler, uv).rgb;
    
    // apply square noise
    col = mix(col, noise(col, uv, MAX_ITERATIONS), 0.03);
    
    // invert
    //col = invert(col);
    
    // convert from rgb to only the max of the three components
    col = maxComponent(col.rgb);
    
    // apply brightness threshold
    col *= col;
    col = step(vec3(1.0 - brightness),col);

    // convert to cga palette
    col = mix(col, cga(col), 1.0);
  
    // output
	gl_FragColor = vec4(col, 1.0);
}