precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 uSpriteSize;
uniform vec2 uBufferSize;

float greenScreen(vec3 _col){
    return step(_col.g - (_col.r + _col.b),0.3);
}

void main(void){
    vec2 uv = vTextureCoord.xy;


    // outline layer
    float a = 0.0;
    const float outline = 0.005;
    for(float x = -outline; x <= outline; x += outline){
    for(float y = -outline; y <= outline; y += outline){

        // convert to sprite space, clamp to 0-1, then convert back
        vec2 _uv = vTextureCoord.xy*uBufferSize/uSpriteSize;
        _uv = clamp(_uv + vec2(x,y), 0.0, 0.999999);
        _uv = _uv/uBufferSize*uSpriteSize;

        a = max(a, greenScreen(texture2D(uSampler, _uv).rgb));
    }
    }
    vec3 outlineColour = vec3(1.0, 0.95, 0.95);

    vec4 col = texture2D(uSampler, uv);


    // main layer
    a = max(a, greenScreen(col.rgb));
    col.rgb = mix(outlineColour, col.rgb, greenScreen(col.rgb));
    
    // output
    gl_FragColor = col * a; // requires pre-multiplied alpha
}