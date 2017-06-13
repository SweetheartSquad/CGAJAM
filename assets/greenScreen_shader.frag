precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 uSpriteSize;
uniform vec2 uBufferSize;
uniform float uScreenMode;

float greenScreen(vec3 _col){
    return step(_col.g - (_col.r),0.035);
}

float whiteScreen(vec3 _col){
    return step(0.5, step(length(_col.rgb),0.7)+step(.5,abs(_col.r-_col.g)+abs(_col.g-_col.b)+abs(_col.r-_col.b)));
}

float blankScreen(vec3 _col, float _screenMode) {
    return mix(greenScreen(_col),whiteScreen(_col),_screenMode);
}

void main(void){
    vec2 uv = vTextureCoord.xy;


    // outline layer
    const float outline = 0.005;
    const vec3 outlineColour = vec3(1.0, 0.95, 0.95);
    float a = 0.0;
    for(float x = -outline; x <= outline; x += outline){
    for(float y = -outline; y <= outline; y += outline){

        // convert to sprite space, clamp to 0-1, then convert back
        vec2 _uv = vTextureCoord.xy*uBufferSize/uSpriteSize;
        _uv = clamp(_uv + vec2(x,y), 0.0, 0.999999);
        _uv = _uv/uBufferSize*uSpriteSize;
        vec4 t = texture2D(uSampler,_uv);
        a = max(a, blankScreen(t.rgb/t.a, uScreenMode));
    }
    }

    vec4 col = texture2D(uSampler, uv);


    // main layer
    a = max(a, blankScreen(col.rgb/col.a, uScreenMode));
    col.rgb = mix(outlineColour, col.rgb, blankScreen(col.rgb, uScreenMode));
    
    // output
    gl_FragColor = col * a; // requires pre-multiplied alpha
}