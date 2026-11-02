import os as _os
REPO = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), '..', '..')) + '/'
AUSORDNER = _os.environ.get('AUS', _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'aus')) + '/'
_os.makedirs(AUSORDNER + 'video', exist_ok=True)
import os, re, math, numpy as np
S = AUSORDNER
exec(open(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'bau.py')).read())
from svgpathtools import parse_path
base_css=[l for l in css if 'flasche' not in l and not l.startswith(('/*','   '))]
import sys
LICHT=sys.argv[1] if len(sys.argv)>1 else '#F3EEE8'   # Warmweiß der App (Daria, 2026-11-02)
AUS=sys.argv[2] if len(sys.argv)>2 else 'Badge Received.svg'
# --- Strahlen: Darias Bewegungsstriche aus der Flasche, je auf Länge 1 entlang -y gelegt, Fuß im Ursprung
ICON=open(REPO + 'Übergabe/Abzeichen-Icons/Property 1=Default, Type=Bottle.svg').read()
subs=parse_path(re.findall(r' d="([^"]+)"',ICON)[0]).continuous_subpaths()
blades=[]
for i in (11,12,13,14,15,3,4,6,7,8):
    sp=subs[i]; pts=np.array([[sp.point(t/80).real,sp.point(t/80).imag] for t in range(80)])
    c=pts.mean(0); u,sv,vt=np.linalg.svd(pts-c); ax=vt[0]
    ang=math.degrees(math.atan2(ax[1],ax[0]))
    p=sp.translated(complex(-c[0],-c[1])).rotated(-ang-90,0)   # Achse nach -y
    x0,x1,y0,y1=p.bbox(); L=y1-y0
    p=p.translated(complex(-(x0+x1)/2,-y1)).scaled(1/L)        # Fuß bei 0, Spitze bei -1
    blades.append((p.d(), (x1-x0)/L))
print('Breite/Länge der Striche', [round(w,2) for _,w in blades])
BL=''.join(f'<path id="strich{k}" d="{d}"/>' for k,(d,_) in enumerate(blades))
# --- Flasche: steigt aus dem Wasser zum Himmel und schwebt (Daria, 2026-11-02)
# Aufstieg mit „human touch“ (Daria, 2026-11-02). Gedanke: Lebendig wirkt eine Bewegung, wenn sie eine Absicht zeigt.
# Die Flasche holt Schwung (taucht ein, zittert), versucht es zaghaft, zögert, sackt ein Stück zurück und steigt dann
# entschlossen auf. Sie schießt über, federt nach und dreht sich mit Verzug in die Senkrechte. Beim schnellen Steigen
# streckt sie sich entlang ihrer Achse, beim Ankommen staucht sie sich. Tropfen fallen von ihr ab ins Meer.
CX,CY=504,520; DX=-69; UP=-185; ROT=52.7; SC=1.45; AX=52.7   # AX dreht die Flaschenachse in die Senkrechte
T0,TA,TB,TC,TD,T1=1.0,1.55,2.15,2.45,3.25,4.0
def smooth(u): u=min(max(u,0),1); return u*u*(3-2*u)
def eout(u): u=min(max(u,0),1); return 1-(1-u)**3
def back(u, s=1.8):
    u=min(max(u,0),1); u-=1; return u*u*((s+1)*u+s)+1
def welle_y(t): return 0.7*(surf(CX,t)-MEAN)
def flasche(t):
    """dx, dy, Drehung, Größe, Streckung entlang der Achse"""
    if t<T0:
        return 0, welle_y(t), BASE, 1, 1
    if t<TA:                                   # Schwung holen: eintauchen, zittern, stauchen
        u=(t-T0)/(TA-T0); k=math.sin(math.pi*u)
        zit=2.5*math.sin(2*math.pi*9*(t-T0))*(1-u)
        return 0, welle_y(t)+14*k, BASE+zit, 1, 1-0.06*k
    if t<TB:                                   # zaghafter Versuch, leicht nach rechts
        u=eout((t-TA)/(TB-TA)); p=0.35*u
        return 8*math.sin(math.pi*u*0.9), welle_y(t)*(1-p*3)+14*(1-u)+UP*p, BASE+(ROT-BASE)*0.4*u, 1+(SC-1)*p, 1+0.05*math.sin(math.pi*u)
    if t<TC:                                   # Zögern: sackt etwas zurück, wackelt
        u=smooth((t-TB)/(TC-TB)); p=0.35-0.05*math.sin(math.pi*u*0.5)
        return 8*math.cos(math.pi*u*0.5)*0.9, UP*p, BASE+(ROT-BASE)*(0.4-0.05*math.sin(math.pi*u)), 1+(SC-1)*p, 1
    if t<TD:                                   # entschlossen: überschießen, Bogen zur Mitte, strecken
        u=(t-TC)/(TD-TC); p=0.30+0.70*back(u)
        dx=7.2*(1-smooth(u))+DX*smooth(u)-10*math.sin(math.pi*u)
        rot=BASE+(ROT-BASE)*(0.35+0.65*back(u,2.4))
        return dx, UP*p, rot, 1+(SC-1)*min(p,1.04), 1+0.10*math.sin(math.pi*min(u*1.3,1))
    if t<T1:                                   # ankommen: stauchen, nachfedern, Drehung schwingt aus
        u=(t-TD)/(T1-TD); e=math.exp(-4*u)
        return DX, UP+9*e*math.sin(2*math.pi*u*1.6), ROT+4*e*math.cos(2*math.pi*u*1.3), SC, 1-0.07*e*math.cos(2*math.pi*u*1.6)
    k=t-T1                                     # schweben, ruhig und leicht unregelmäßig (Perioden teilen 6,4 s)
    return DX, UP+6*math.sin(2*math.pi*k/6.4)+1.8*math.sin(2*math.pi*k/2.133+1.3), ROT+0.6*math.sin(2*math.pi*k/3.2+0.4), SC, 1
def kf(name,f,t0,dur,step=0.05):
    n=int(round(dur/step)); out=[]
    for i in range(n+1):
        dx,dy,r,sc,st=f(t0+i*step)
        out.append(f'{100*i/n:.3f}%{{transform:translate({dx:.1f}px,{dy:.1f}px) rotate({r:.2f}deg) scale({sc:.3f}) rotate({-AX}deg) scale({1/math.sqrt(st):.3f},{st:.3f}) rotate({AX}deg)}}')
    return f'@keyframes {name}{{'+''.join(out)+'}'
# Tropfen: fallen vom Boden der Flasche, so wie sie gerade steht, und verschwinden im Wasser
def welt(px,py,t):
    dx,dy,r,sc,st=f2=flasche(t)
    x,y=px-CX,py-CY
    a=math.radians(AX); x,y=x*math.cos(a)-y*math.sin(a), x*math.sin(a)+y*math.cos(a)
    x,y=x/math.sqrt(st),y*st
    a=math.radians(-AX); x,y=x*math.cos(a)-y*math.sin(a), x*math.sin(a)+y*math.cos(a)
    x,y=x*sc,y*sc
    a=math.radians(r); x,y=x*math.cos(a)-y*math.sin(a), x*math.sin(a)+y*math.cos(a)
    return CX+dx+x, CY+dy+y
BODEN=(579,607)
trng=np.random.default_rng(11); TROPFEN=[]; TROPF_CSS=[]
for k,(ts,n) in enumerate([(1.7,3),(2.55,4),(2.95,3),(3.2,2)]):
    for j in range(n):
        x0,y0=welt(BODEN[0]+trng.normal(0,10),BODEN[1]+trng.normal(0,4),ts)
        x1,y1=welt(*BODEN,ts+0.05); vx=(x1-x0)/0.05*0.4+trng.normal(0,25); vy=min((y1-y0)/0.05*0.4,0)+trng.normal(-30,30)
        r=trng.uniform(3,5.5); steps=[]; tt=0.0
        while tt<1.5:
            x=x0+vx*tt; y=y0+vy*tt+0.5*900*tt*tt
            steps.append((tt,x,y)); 
            if y>MEAN-8: break
            tt+=0.03
        dur=steps[-1][0] or 0.03; nm=f'tropfen{k}_{j}'
        fr=''.join(f'{100*tt/dur:.2f}%{{transform:translate({x:.1f}px,{y:.1f}px);opacity:{1 if tt<dur*0.85 else 0}}}' for tt,x,y in steps)
        TROPF_CSS.append(f'.{nm}{{opacity:0;animation:{nm} {dur:.2f}s linear {ts:.2f}s 1 forwards}}@keyframes {nm}{{{fr}}}')
        TROPFEN.append(f'<ellipse class="{nm}" cx="0" cy="0" rx="{r*0.8:.1f}" ry="{r:.1f}" fill="#CFF6FF"/>')
# --- Strahlen: kurz nahe der Flasche, wandern nach außen, werden länger, reißen dann ab (SMIL, je Strahl eigener Takt)
RCX,RCY=CX+DX,CY+UP
# Strahlen (Daria, 2026-11-02)
# Pakete wie im Icon: 7 Pakete gleichmäßig im Kreis, je 3 Striche 5° auseinander.
# Impulse: Die Flasche sendet in Gruppen, abwechselnd 2 und 3 Impulse kurz hintereinander, dann eine Pause.
# Jeder Impuls schwankt minimal (Zeitpunkt, Weite, Länge).
# Verlängern: Nur die Mitte des Strichs wird gedehnt, die runden Enden behalten ihre Form. Sonst wirkt er verzerrt.
from svgpathtools import CubicBezier, Line, Path as SPath
rng=np.random.default_rng(4); D=1.3; GAP=0.3; G=25.6/12 if os.environ.get('VIDEO')=='1' else 2.1; GRUPPEN=[2,3,2,3]; C=G*len(GRUPPEN); BEG=3.25
RX,RY=88,168; BASIS=60.0; KAPPE=13.0
FORMEN=[2,3,4,7,8,9]          # Striche mit 5 bis 6 Segmenten aus Darias Icon
basis_pfad=[parse_path(blades[k][0]).scaled(BASIS) for k in FORMEN]   # Fuß bei 0, Spitze bei -60
def dehnen(path,L,r):
    """Strich auf Länge L bringen: Kappen bleiben, die Mitte wird gedehnt; Fuß bei -r (nach oben = außen)"""
    mitte=BASIS-2*KAPPE; neu=max(L-2*KAPPE,1.0)
    def f(z):
        y=z.imag
        if y>-KAPPE: y2=y
        elif y<-(BASIS-KAPPE): y2=y-(L-BASIS)
        else: y2=-KAPPE+(y+KAPPE)*neu/mitte
        return complex(z.real, y2-r)
    segs=[]
    for seg in path:
        if isinstance(seg,CubicBezier): segs.append(CubicBezier(f(seg.start),f(seg.control1),f(seg.control2),f(seg.end)))
        else: segs.append(Line(f(seg.start),f(seg.end)))
    return ''.join(f'{"M" if i==0 else ""}{" " if i else ""}' for i in [])+SPath(*segs).d().replace(',', ' ')
def runde(d): return re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.1f}', d)
impulse=[]   # (Zeit im Zyklus, Platz 0..2)
for g,n in enumerate(GRUPPEN):
    t=g*G+rng.normal(0,0.04)
    for k in range(n): impulse.append((t+k*GAP+rng.normal(0,0.025),k))
defs=[]; rays=[]
for p_i in range(7):
    mitte=p_i*360/7; th=math.radians(mitte); rr=RX*RY/math.sqrt((RY*math.sin(th))**2+(RX*math.cos(th))**2)
    for platz in range(3):
        for teil in ('A','B'):
            form=basis_pfad[(p_i*2+platz+(3 if teil=='B' else 0))%len(basis_pfad)]
            keys=[]
            for t0,k in impulse:
                if k!=platz: continue
                r0=rr+14+rng.normal(0,3); r1=rr+250+rng.normal(0,10); L=72*rng.uniform(0.93,1.07)
                if teil=='A':
                    pts=[(0,0,r0,0.4*L),(.08,1,None,None),(.38,1,r1*0.75,0.95*L),(.45,1,None,None),(.62,0,r1,L)]
                else:
                    pts=[(0,0,r0,0.35*L),(.28,0,r0+50,0.5*L),(.38,1,None,None),(.62,0,r1*0.62,0.42*L)]
                # fehlende Werte linear füllen
                kn=[(q[0],q[2],q[3]) for q in pts if q[2] is not None]
                for q in pts:
                    u=q[0]
                    if q[2] is None:
                        lo=max(x for x in kn if x[0]<=u); hi=min(x for x in kn if x[0]>=u); f_=(u-lo[0])/((hi[0]-lo[0]) or 1)
                        rv,lv=lo[1]+(hi[1]-lo[1])*f_, lo[2]+(hi[2]-lo[2])*f_
                    else: rv,lv=q[2],q[3]
                    keys.append((t0+u*D,q[1],rv,lv))
            keys.sort()
            first=keys[0]; last=keys[-1]
            keys=[(0.0,0,first[2],first[3])]+[x for x in keys if 0<x[0]<C]+[(C,0,last[2],last[3])]
            kt=';'.join(f'{x[0]/C:.4f}' for x in keys)
            dvals=';'.join(runde(dehnen(form,x[3],x[2])) for x in keys)
            ovals=';'.join(f'{x[1]:.2f}' for x in keys)
            pid=f'strahl{p_i}_{platz}{teil}'
            defs.append(f'<path id="{pid}" fill="{LICHT}" opacity="0" d="{runde(dehnen(form,first[3],first[2]))}">'
                        f'<animate attributeName="d" values="{dvals}" keyTimes="{kt}" dur="{C:.2f}s" begin="{BEG}s" repeatCount="indefinite"/>'
                        f'<animate attributeName="opacity" values="{ovals}" keyTimes="{kt}" dur="{C:.2f}s" begin="{BEG}s" repeatCount="indefinite"/></path>')
            for off in (-5,0,5):
                rays.append(f'<use href="#{pid}" transform="translate({RCX} {RCY}) rotate({mitte+off:.1f})"/>')
BL=BL+''.join(defs)
STRAHLEN='<g class="strahlen">'+'\n'.join(rays)+'</g>'
# Leuchten der Flasche
GLOW=f'''<filter id="leuchten" x="-40%" y="-40%" width="180%" height="180%">
<feMorphology in="SourceAlpha" operator="dilate" radius="{14/SC:.1f}" result="rand"><animate attributeName="radius" values="{14/SC:.1f};{10/SC:.1f};{14/SC:.1f}" dur="3.2s" begin="3.25s" repeatCount="indefinite"/></feMorphology>
<feFlood flood-color="{LICHT}" flood-opacity="0"><animate attributeName="flood-opacity" values="0;1" dur=".25s" begin="3.2s" fill="freeze"/></feFlood><feComposite in2="rand" operator="in" result="ring"/><feComposite in="ring" in2="SourceAlpha" operator="out" result="schein"/>
<feMorphology in="rand" operator="dilate" radius="2.5" result="rand2"/><feFlood flood-color="#191716" flood-opacity="0"><animate attributeName="flood-opacity" values="0;1" dur=".25s" begin="3.2s" fill="freeze"/></feFlood><feComposite in2="rand2" operator="in" result="ring2"/><feComposite in="ring2" in2="rand" operator="out" result="linie"/>
<feMerge><feMergeNode in="linie"/><feMergeNode in="schein"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'''
c=['/* Badge Received, nach Darias Szene (2026-11-02). Die Flasche steigt aus dem Wasser, hebt sich zum Himmel und strahlt.',
   '   Die Flasche schwebt senkrecht. Strahlen: Darias Bewegungsstriche, in zwei Paketen im Wechsel. Nahe der Flasche kurz, nach außen länger, dann reißen sie ab,',
   '   ein zweites Stück bleibt zurück (wie im Zeichentrick). Der Schein ist eine harte Kontur in Vollfarbe ohne Unschärfe. */']+base_css+[
   f'.flasche{{transform-box:view-box;transform-origin:{CX}px {CY}px;animation:flasche-weg {T1}s linear forwards,flasche-schweben 6.4s linear {T1}s infinite}}',
   kf('flasche-weg',flasche,0,T1),kf('flasche-schweben',flasche,T1,6.4)]+TROPF_CSS
out=svg.replace(svg[svg.index('<style>'):svg.index('</style>')+8],'<style>\n'+'\n'.join(c)+'\n</style>')
out=out.replace('<clipPath id="scheibe">',BL+GLOW+'<clipPath id="scheibe">',1)
a=out.index('<g class="flasche">'); b=out.index('</g>',a)+4
inner=out[a+len('<g class="flasche">'):b-4]
out=out[:a]+out[b:]
end=out.rindex('</g>\n</svg>')
vv=out.index('<rect x="0" y="380" width="870" height="460"',out.index('mask="url(#m-mitte)"'))
# Strahlen und Flasche hinter den vorderen Wellen: Im Wasser verdecken sie den Boden der Flasche, am Himmel liegt sie frei
out=out[:vv]+STRAHLEN+'\n'+''.join(TROPFEN)+'\n'+f'<g class="flasche"><g filter="url(#leuchten)">{inner}</g></g>\n'+out[vv:]
open(S+AUS,'w').write(out); print(len(out)//1024,'KB')
