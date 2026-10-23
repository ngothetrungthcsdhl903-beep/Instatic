import json
gray={"0":"#FFFFFF","25":"#FAFAFB","50":"#F5F5F7","100":"#EDEDF0","150":"#E3E3E8","200":"#D6D6DC","300":"#BDBDC5","400":"#9A9AA3","500":"#76767F","600":"#5C5C64","700":"#46464D","750":"#3A3A40","800":"#2E2E33","850":"#252529","900":"#1E1E21","950":"#161618","1000":"#0E0E10"}
blue={"50":"#EEF5FF","100":"#D9E8FF","200":"#B3D1FF","300":"#82B3FF","400":"#4D92FF","500":"#2B7BF7","600":"#0A66E0","700":"#0055C2","800":"#00469E","900":"#003478"}
green={"light":"#1E7F45","dark":"#4CC27A"};amber={"light":"#9A5B00","dark":"#E3A63A"};red={"light":"#C8312B","dark":"#FF6B60"}
L={"bg-canvas":gray["100"],"bg-panel":gray["25"],"bg-surface":gray["0"],"bg-elevated":gray["0"],"bg-control":gray["0"],"bg-control-hover":gray["50"],"bg-control-pressed":gray["100"],"bg-hover":"rgba(0,0,0,0.05)","bg-pressed":"rgba(0,0,0,0.09)",
"fg-primary":"#1D1D20","fg-secondary":gray["600"],"fg-tertiary":"#6B6B73","fg-disabled":gray["300"],"fg-on-accent":"#FFFFFF",
"border":gray["200"],"border-strong":gray["400"],"separator":"rgba(0,0,0,0.08)","control-border":"#8E8E96",
"accent":blue["600"],"accent-hover":blue["700"],"accent-pressed":blue["800"],"accent-subtle":"rgba(10,102,224,0.10)","accent-text":blue["700"],"focus-ring":blue["500"],
"selection":"rgba(10,102,224,0.14)","selection-strong":blue["600"],"canvas-selection":blue["500"],
"success":green["light"],"success-subtle":"rgba(30,127,69,0.10)","warning":amber["light"],"warning-subtle":"rgba(154,91,0,0.10)","danger":red["light"],"danger-subtle":"rgba(200,49,43,0.10)"}
D={"bg-canvas":gray["1000"],"bg-panel":gray["900"],"bg-surface":gray["850"],"bg-elevated":gray["800"],"bg-control":gray["800"],"bg-control-hover":gray["750"],"bg-control-pressed":gray["700"],"bg-hover":"rgba(255,255,255,0.06)","bg-pressed":"rgba(255,255,255,0.10)",
"fg-primary":"#ECECEF","fg-secondary":"#A8A8B0","fg-tertiary":"#9A9AA2","fg-disabled":gray["600"],"fg-on-accent":"#FFFFFF",
"border":gray["750"],"border-strong":gray["600"],"separator":"rgba(255,255,255,0.08)","control-border":"#7A7A82",
"accent":"#1F6FEB","accent-hover":"#1A63D6","accent-pressed":"#1655BD","accent-subtle":"rgba(77,146,255,0.16)","accent-text":blue["300"],"focus-ring":blue["400"],
"selection":"rgba(77,146,255,0.22)","selection-strong":"#1F6FEB","canvas-selection":blue["400"],
"success":green["dark"],"success-subtle":"rgba(76,194,122,0.14)","warning":amber["dark"],"warning-subtle":"rgba(227,166,58,0.14)","danger":red["dark"],"danger-subtle":"rgba(255,107,96,0.14)"}
HC_L={"fg-secondary":"#3F3F45","fg-tertiary":"#4F4F56","border":gray["500"],"separator":"rgba(0,0,0,0.30)","control-border":"#5C5C64","focus-ring":blue["700"]}
HC_D={"fg-secondary":"#CFCFD5","fg-tertiary":"#B4B4BB","border":gray["500"],"separator":"rgba(255,255,255,0.30)","control-border":"#A8A8B0","focus-ring":blue["300"]}
font={"family-sans":"'Inter', 'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif","family-mono":"'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace","feature-ui":"'cv11', 'ss01', 'tnum'"}
type_={"caption":(11,14,400,"0.01em"),"footnote":(12,16,400,"0"),"body":(13,18,400,"-0.003em"),"body-strong":(13,18,600,"-0.003em"),"label":(12,16,500,"0"),"section":(11,14,600,"0.02em"),"headline":(15,20,600,"-0.01em"),"title":(17,22,600,"-0.015em"),"large-title":(22,28,700,"-0.02em"),"mono":(12,16,450,"0")}
weight={"regular":400,"medium":500,"semibold":600,"bold":700}
space={"0":0,"0-5":2,"1":4,"1-5":6,"2":8,"3":12,"4":16,"5":20,"6":24,"8":32,"10":40,"12":48}
radius={"xs":3,"sm":5,"md":6,"lg":8,"xl":12,"2xl":16,"full":9999}
shadowL={"sm":"0 1px 2px rgba(0,0,0,0.08)","md":"0 2px 6px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.10)","lg":"0 8px 24px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.12)","xl":"0 18px 48px rgba(0,0,0,0.20), 0 0 0 0.5px rgba(0,0,0,0.12)","control":"0 0.5px 1px rgba(0,0,0,0.12)"}
shadowD={"sm":"0 1px 2px rgba(0,0,0,0.40)","md":"0 2px 8px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.08)","lg":"0 10px 28px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.10)","xl":"0 20px 56px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.10)","control":"0 0.5px 1px rgba(0,0,0,0.50)"}
# Fake glass: semi-opaque fill, sheen, feather mask, highlight, shadow, tiled noise.
# Blur stays 0 — chrome must not use backdrop-filter (drag stays on the compositor).
NOISE="url('/brand/noise.png')"
FEATHER_Y="linear-gradient(180deg, transparent 0, #000 6px, #000 calc(100% - 6px), transparent 100%)"
FEATHER_X="linear-gradient(90deg, transparent 0, #000 6px, #000 calc(100% - 6px), transparent 100%)"
def sheen(top): return f"linear-gradient(180deg, {top} 0%, rgba(255,255,255,0) 46%)"
def mat(bg, highlight, shadow, sheen_top):
  return {"bg":bg,"highlight":highlight,"shadow":shadow,"sheen":sheen(sheen_top),"feather-y":FEATHER_Y,"feather-x":FEATHER_X,"noise":NOISE}
glassL={"thin":mat("rgba(250,250,252,0.72)","rgba(255,255,255,0.72)","0 8px 24px rgba(0,0,0,0.10)","rgba(255,255,255,0.55)"),
"regular":mat("rgba(248,248,250,0.78)","rgba(255,255,255,0.78)","0 10px 28px rgba(0,0,0,0.12)","rgba(255,255,255,0.48)"),
"thick":mat("rgba(246,246,248,0.85)","rgba(255,255,255,0.82)","0 14px 36px rgba(0,0,0,0.16)","rgba(255,255,255,0.42)")}
glassD={"thin":mat("rgba(44,44,48,0.72)","rgba(255,255,255,0.14)","0 10px 28px rgba(0,0,0,0.45)","rgba(255,255,255,0.12)"),
"regular":mat("rgba(36,36,40,0.80)","rgba(255,255,255,0.16)","0 12px 32px rgba(0,0,0,0.50)","rgba(255,255,255,0.10)"),
"thick":mat("rgba(30,30,34,0.85)","rgba(255,255,255,0.18)","0 16px 40px rgba(0,0,0,0.55)","rgba(255,255,255,0.08)")}
glassSolid={"light":"#F7F7F9","dark":"#2A2A2E"}
dur={"instant":"0ms","fast":"100ms","base":"160ms","slow":"240ms","slower":"360ms"}
ease={"standard":"cubic-bezier(0.2, 0, 0, 1)","out":"cubic-bezier(0.16, 1, 0.3, 1)","in":"cubic-bezier(0.4, 0, 1, 1)","linear":"linear"}
spring={"snappy":{"stiffness":520,"damping":40,"mass":1},"smooth":{"stiffness":320,"damping":34,"mass":1},"bouncy":{"stiffness":400,"damping":24,"mass":1}}
z={"canvas":0,"canvas-overlay":10,"panel":100,"toolbar":200,"dropdown":300,"popover":400,"menu":500,"modal":600,"toast":700,"tooltip":800,"drag":900}
ctl={"height-sm":22,"height-md":28,"height-lg":32,"icon-sm":14,"icon-md":16,"icon-lg":20,"icon-stroke":1.5,"icon-stroke-strong":2,"label-col":72,"row-gap":8}
layout={"toolbar-height":44,"sidebar-width":240,"sidebar-min":200,"sidebar-max":360,"inspector-width":264,"inspector-min":240,"inspector-max":360,"section-header-height":32,"row-height":28,"tree-row-height":24,"tree-indent":12,"breakpoint-gap":80,"breakpoint-label-height":24}
bps={"desktop":1440,"tablet":810,"mobile":390}
px=lambda v:f"{v}px" if v else "0"
def tok(v,t): return {"$value":v,"$type":t}
J={"$description":"Keijam design tokens. CSS: --k-<path joined by ->","primitive":{"gray":{k:tok(v,"color") for k,v in gray.items()},"blue":{k:tok(v,"color") for k,v in blue.items()},"green":{k:tok(v,"color") for k,v in green.items()},"amber":{k:tok(v,"color") for k,v in amber.items()},"red":{k:tok(v,"color") for k,v in red.items()}},
"color":{"light":{k:tok(v,"color") for k,v in L.items()},"dark":{k:tok(v,"color") for k,v in D.items()},"contrast-more":{"light":{k:tok(v,"color") for k,v in HC_L.items()},"dark":{k:tok(v,"color") for k,v in HC_D.items()}}},
"font":{k:tok(v,"fontFamily" if "family" in k else "string") for k,v in font.items()},"font-weight":{k:tok(v,"fontWeight") for k,v in weight.items()},
"type":{k:{"size":tok(px(a),"dimension"),"line":tok(px(b),"dimension"),"weight":tok(c,"fontWeight"),"tracking":tok(d,"dimension")} for k,(a,b,c,d) in type_.items()},
"space":{k:tok(px(v),"dimension") for k,v in space.items()},"radius":{k:tok(px(v),"dimension") for k,v in radius.items()},
"shadow":{"light":{k:tok(v,"shadow") for k,v in shadowL.items()},"dark":{k:tok(v,"shadow") for k,v in shadowD.items()}},
"material":{m:{lvl:{k:tok(val,"color" if k in ("bg","highlight") else "string") for k,val in spec.items()} | {"blur":tok("0px","dimension"),"saturate":tok(1,"number")} for lvl,spec in g.items()} | {"solid-fallback":tok(glassSolid[m],"color")} for m,g in (("light",glassL),("dark",glassD))},
"duration":{k:tok(v,"duration") for k,v in dur.items()},"ease":{k:tok(v,"cubicBezier") for k,v in ease.items()},
"spring":{k:{p:tok(x,"number") for p,x in v.items()} for k,v in spring.items()},"z":{k:tok(v,"number") for k,v in z.items()},
"control":{k:tok(v if "stroke" in k else px(v),"number" if "stroke" in k else "dimension") for k,v in ctl.items()},
"layout":{k:tok(px(v),"dimension") for k,v in layout.items()},"breakpoint":{k:tok(px(v),"dimension") for k,v in bps.items()}}
json.dump(J,open("tokens.json","w"),indent=2)
def block(sel,d,ind="  "): return f"{sel} {{\n"+"".join(f"{ind}--k-{k}: {v};\n" for k,v in d.items())+"}\n"
def themevars(C,S,G,m):
  d={f"color-{k}":v for k,v in C.items()}; d|={f"shadow-{k}":v for k,v in S.items()}
  for lvl,spec in G.items():
    for key,val in spec.items(): d[f"material-{lvl}-{key}"]=val
    d[f"material-{lvl}-blur"]="0px"; d[f"material-{lvl}-saturate"]="1"
  d["material-solid-fallback"]=glassSolid[m]; d["color-scheme"]=m; return d
static={}
for n,r in (("gray",gray),("blue",blue)): static|={f"{n}-{k}":v for k,v in r.items()}
for n,r in (("green",green),("amber",amber),("red",red)): static|={f"{n}-{k}":v for k,v in r.items()}
static|={f"font-{k}":v for k,v in font.items()}|{f"font-weight-{k}":v for k,v in weight.items()}
for k,(a,b,c,d) in type_.items(): static|={f"type-{k}-size":px(a),f"type-{k}-line":px(b),f"type-{k}-weight":c,f"type-{k}-tracking":d}
static|={f"space-{k}":px(v) for k,v in space.items()}|{f"radius-{k}":px(v) for k,v in radius.items()}
static|={f"duration-{k}":v for k,v in dur.items()}|{f"ease-{k}":v for k,v in ease.items()}
for k,v in spring.items(): static|={f"spring-{k}-{p}":x for p,x in v.items()}
static|={f"z-{k}":v for k,v in z.items()}|{f"control-{k}":(v if "stroke" in k else px(v)) for k,v in ctl.items()}|{f"layout-{k}":px(v) for k,v in layout.items()}|{f"breakpoint-{k}":px(v) for k,v in bps.items()}
LV=themevars(L,shadowL,glassL,"light"); DV=themevars(D,shadowD,glassD,"dark")
css="/* Keijam tokens — generated by gen.py from the same source as tokens.json. Do not edit by hand. */\n\n"
css+=block(":root",static|LV)+"\n:root { color-scheme: var(--k-color-scheme); }\n\n"
css+=block('[data-theme="dark"]',DV)+"\n"
css+="@media (prefers-color-scheme: dark) {\n"+block('  [data-theme="system"]',DV,"    ").replace("\n}","\n  }")+"}\n\n"
glassoff={}
for l in glassL:
  glassoff|={f"material-{l}-bg":"var(--k-material-solid-fallback)",f"material-{l}-blur":"0px",f"material-{l}-saturate":"1",f"material-{l}-sheen":"none",f"material-{l}-noise":"none",f"material-{l}-shadow":"none",f"material-{l}-highlight":"transparent",f"material-{l}-feather-y":"linear-gradient(#000, #000)",f"material-{l}-feather-x":"linear-gradient(#000, #000)"}
css+="/* Reduced transparency: glass -> solid */\n@media (prefers-reduced-transparency: reduce) {\n"+block("  :root, [data-theme]",glassoff,"    ").replace("\n}","\n  }")+"}\n\n"
css+="/* Reduced motion: springs/transforms -> instant; opacity fades capped at fast */\n@media (prefers-reduced-motion: reduce) {\n"+block("  :root",{"duration-base":"100ms","duration-slow":"100ms","duration-slower":"100ms","motion-transform":"none","motion-scale":"1"},"    ").replace("\n}","\n  }")+"}\n\n"
css+="/* More contrast */\n@media (prefers-contrast: more) {\n"+block("  :root",{f"color-{k}":v for k,v in HC_L.items()},"    ").replace("\n}","\n  }")+block('  [data-theme="dark"]',{f"color-{k}":v for k,v in HC_D.items()},"    ").replace("\n}","\n  }")+"}\n"
css+="@media (prefers-contrast: more) and (prefers-color-scheme: dark) {\n"+block('  [data-theme="system"]',{f"color-{k}":v for k,v in HC_D.items()},"    ").replace("\n}","\n  }")+"}\n"
open("tokens.css","w").write(css.replace(":root {\n  --k-gray-0",":root {\n  --k-motion-transform: initial;\n  --k-motion-scale: 1;\n  --k-gray-0",1))
