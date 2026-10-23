import json,re
def hx(h):h=h.lstrip('#');return [int(h[i:i+2],16)/255 for i in (0,2,4)]
def parse(c,bg):
  if c.startswith('#'):return hx(c)
  r,g,b,a=map(float,re.findall(r'[\d.]+',c));return [(x/255)*a+y*(1-a) for x,y in zip((r,g,b),bg)]
def lum(c):return sum(w*((v/12.92) if v<=0.03928 else ((v+0.055)/1.055)**2.4) for w,v in zip((0.2126,0.7152,0.0722),c))
def cr(a,b):la,lb=sorted([lum(a),lum(b)],reverse=True);return (la+0.05)/(lb+0.05)
J=json.load(open('tokens.json'));fail=0
pairs=[("fg-primary","bg-panel",4.5),("fg-primary","bg-canvas",4.5),("fg-primary","bg-elevated",4.5),("fg-secondary","bg-panel",4.5),("fg-secondary","bg-surface",4.5),("fg-tertiary","bg-panel",4.5),("fg-tertiary","bg-control",4.5),("fg-on-accent","accent",4.5),("fg-on-accent","accent-hover",4.5),("fg-on-accent","accent-pressed",4.5),("accent-text","bg-panel",4.5),("accent-text","bg-surface",4.5),("accent","bg-panel",3),("focus-ring","bg-panel",3),("control-border","bg-panel",3),("control-border","bg-control",3),("success","bg-panel",4.5),("warning","bg-panel",4.5),("danger","bg-panel",4.5),("fg-primary","selection",4.5)]
for m in ("light","dark"):
  C={k:v["$value"] for k,v in J["color"][m].items()}
  for f,b,need in pairs:
    bg=parse(C[b],hx(C["bg-panel"])); r=cr(parse(C[f],bg),bg); ok=r>=need; fail+=not ok
    print(f"{m:5} {f:15} on {b:13} {r:5.2f}:1 need {need} {'PASS' if ok else 'FAIL'}")
  for lvl,g in J["material"][m].items():
    if lvl=="solid-fallback":continue
    worst=min(cr(hx(C["fg-primary"]),parse(g["bg"]["$value"],hx(x))) for x in ("#000000","#FFFFFF"))
    print(f"{m:5} fg-primary on glass-{lvl} worst-case backdrop {worst:.2f}:1 {'PASS' if worst>=4.5 else 'FAIL'}"); fail+=worst<4.5
s=open('tokens.css').read();print("braces",s.count('{'),s.count('}'));print("FAILS",fail)
