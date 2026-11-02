import os as _os
REPO = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), '..', '..')) + '/'
AUSORDNER = _os.environ.get('AUS', _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'aus')) + '/'
_os.makedirs(AUSORDNER + 'video', exist_ok=True)
import math
import re, json, base64, io, numpy as np
from PIL import Image
from scipy.interpolate import CubicSpline
from skimage import measure
S = AUSORDNER
src=open(REPO + 'design/abzeichen/vorlagen/Bottle.svg').read()
K=json.load(open(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'flasche-kontur.json')))
# Periode und Richtung je Ebene (die Kopie liegt links: läuft nach rechts; rechts: läuft nach links)
EB={'hinten':(997,-1,26,3,4.2),'mitte':(989,1,20,4,3.6),'vorn_verlauf':(889,1,25.6,5,3.2),'vorn':(853,-1,13,6,2.8)}
import os
if os.environ.get('VIDEO')=='1': EB={'hinten':(997,-1,25.6,3,25.6/6),'mitte':(989,1,25.6,4,3.2),'vorn_verlauf':(889,1,25.6,5,3.2),'vorn':(853,-1,12.8,6,2.56)}
def periodisch(name,L):
    x=np.array(K[name]['x']); y=np.array(K[name]['y'])
    # Stücke trennen, an den Rändern 10 px weglassen (dort schneidet die Scheibe)
    cut=np.where(np.diff(x)>1.5)[0][0]+1
    pts={}
    for xs,ys in ((x[:cut],y[:cut]),(x[cut:],y[cut:])):
        m=(xs>xs.min()+22)&(xs<xs.max()-22)
        for a,b in zip(xs[m],ys[m]): pts[int(round(a))%L]=b
    k=np.array(sorted(pts)); v=np.array([pts[i] for i in k])
    # Lücke mit einem passenden Stück der eigenen Welle füllen (Kreuzungen und Spitzen bleiben erhalten)
    g=np.arange(L); known=np.isin(g,k); yy=np.full(L,np.nan); yy[k]=v
    # vereinzelte Löcher (Rundung) linear schließen, dann die große Lücke suchen
    for i in np.where(~known)[0]:
        if known[(i-1)%L] and known[(i+1)%L]: yy[i]=(yy[(i-1)%L]+yy[(i+1)%L])/2; known[i]=True
    starts=np.where(~known & np.roll(known,1))[0]
    runs=[]
    for a0 in starts:
        n=0
        while not known[(a0+n)%L]: n+=1
        runs.append((n,int(a0)))
    gap,a=max(runs); m=20
    Y=np.concatenate([yy,yy,yy]); off=L
    left=Y[off+a-m:off+a]; right=Y[off+a+gap:off+a+gap+m]
    best=None
    for s0 in range(L):
        w=Y[off+s0-m:off+s0+gap+m]
        if np.isnan(w).any(): continue
        e0=np.mean(left-w[:m]); e1=np.mean(right-w[-m:])
        err=np.mean(np.abs(left-w[:m]-e0))+np.mean(np.abs(right-w[-m:]-e1))+0.05*abs(e1-e0)
        if best is None or err<best[0]: best=(err,s0,e0,e1,w)
    err,s0,e0,e1,w=best
    e0=left[-1]-w[m-1]; e1=right[0]-w[m+gap]   # Enden exakt anschließen
    fillv=w[m:m+gap]+np.linspace(e0,e1,gap+2)[1:-1]
    for j in range(gap): yy[(a+j)%L]=fillv[j]
    return yy,gap
paths={}
for name,(L,dirn,dur,amp,bob) in EB.items():
    yy,gap=periodisch(name,L)
    xs=np.arange(-L-40,870+L+40,2)
    top=[(X,yy[int(X)%L]) for X in xs]
    d='M'+' L'.join(f'{a:.0f} {b:.1f}' for a,b in top)+f' L{xs[-1]} 840 L{xs[0]} 840Z'
    paths[name]=d; print(name,'Periode',L,'geschlossene Lücke',gap,'px')
# Scheibe aus dem Alpha des Himmelsbildes
b64=re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)',src).group(1)
im=np.array(Image.open(io.BytesIO(base64.b64decode(b64))))[...,3]
c=max(measure.find_contours(np.pad(im,2),128),key=len)[::6]
ix,iy,iw,ih=31.7026,-3.1145,800.642,802.723
disc='M'+' L'.join(f'{ix+(p[1]-2)/im.shape[1]*iw:.1f} {iy+(p[0]-2)/im.shape[0]*ih:.1f}' for p in c)+'Z'
# Bausteine aus Darias Datei
img=re.search(r'<image[^>]*/>',src).group(0)
P=re.findall(r'<path[^>]*/>',src)   # in Reihenfolge
uses=re.findall(r'<use[^>]*/>',src)
defs=re.search(r'<defs>.*</defs>',src,re.S).group(0)
flasche='\n'.join(P[2:6]+uses[:4])
def fill(i): 
    m=re.search(r'<path[^>]*?((?:fill-rule="[^"]*" clip-rule="[^"]*" )?fill="[^"]*"(?: fill-opacity="[^"]*")?)',P[i]); return m.group(1)
f_hinten=re.search(r'fill="[^"]*"(?: fill-opacity="[^"]*")?',P[0]).group(0)
f_mitte=re.search(r'fill="[^"]*"(?: fill-opacity="[^"]*")?',P[1]).group(0)
f_vorn=re.search(r'fill="[^"]*"(?: fill-opacity="[^"]*")?',P[6]).group(0)
f_vv=[re.search(r'fill="[^"]*"(?: fill-opacity="[^"]*")?',u).group(0) for u in uses[4:6]]
css=['/* Bottle Reward, endlose Wellen nach Darias Vorlage (2026-11-01).',
'   Jede Welle ist periodisch: Anfang und Ende gleich. Sie läuft genau eine Periode weit, linear, ohne Ende.',
'   Hinten und vorn laufen nach links, die beiden mittleren nach rechts; vorn schneller als hinten (Tiefe).',
'   Die Farben stehen still, nur die Form der Welle wandert (Maske). Dazu hebt und senkt sich jede Welle leicht.',
'   Flasche: reitet auf der Welle vor ihr (70 % ihrer Höhe, Neigung nach der Steigung). Sie kommt von rechts,\n   quert langsam das Bild, kehrt zurück nach Mitte rechts, gleitet minimal nach links, bleibt stehen\n   und bewegt sich dann nur noch auf und ab. Die Welle unter ihr läuft langsam (25,6 s je Periode). */']
masks=[]
for name,(L,dirn,dur,amp,bob) in EB.items():
    c_=name.replace('_','-')
    css.append(f'.lauf-{c_}{{animation:lauf-{c_} {dur}s linear infinite}}')
    css.append(f'@keyframes lauf-{c_}{{from{{transform:translateX(0)}}to{{transform:translateX({dirn*L}px)}}}}')
    css.append(f'.heben-{c_}{{animation:heben-{c_} {bob}s cubic-bezier(.3,.2,.7,.8) -{bob/2}s infinite alternate}}')
    css.append(f'@keyframes heben-{c_}{{from{{transform:translateY(-{amp}px)}}to{{transform:translateY({amp}px)}}}}')
    masks.append(f'<mask id="m-{c_}" maskUnits="userSpaceOnUse" x="0" y="0" width="870" height="840"><g class="heben-{c_}"><path class="lauf-{c_}" d="{paths[name]}" fill="#fff"/></g></mask>')
# Flasche reitet auf der Welle vor ihr (vorn_verlauf): Höhe und Neigung der Oberfläche unter ihr, etwas gedämpft
def bez(x1,y1,x2,y2):
    def f(p):
        lo,hi=0.0,1.0
        for _ in range(40):
            t=(lo+hi)/2; X=3*(1-t)**2*t*x1+3*(1-t)*t*t*x2+t**3
            lo,hi=(t,hi) if X<p else (lo,t)
        t=(lo+hi)/2; return 3*(1-t)**2*t*y1+3*(1-t)*t*t*y2+t**3
    return f
EASE=bez(.3,.2,.7,.8)
Lf,dirf,durf,ampf,bobf=EB['vorn_verlauf']; yyf,_=periodisch('vorn_verlauf',Lf)
def heave(t):
    tau=t+bobf/2; c=int(tau//bobf); fr=tau/bobf-c; p=fr if c%2==0 else 1-fr
    return -ampf+2*ampf*EASE(p)
def surf(x,t):
    shift=dirf*Lf*((t/durf)%1); X=x-shift
    i=int(np.floor(X))%Lf; j=(i+1)%Lf; fr=X-np.floor(X)
    return yyf[i]*(1-fr)+yyf[j]*fr+heave(t)
MEAN=float(yyf.mean()); FOLLOW=0.7; X0=500
# Weg: von rechts herein, quer bis links (x 210), zurück zur Mitte (x 500), stehen. Kaum Bremsen vor dem Umkehren.
def weg(u,brems):
    # Geschwindigkeit 1, im letzten Anteil 'brems' linear auf 0; normiert auf Weg 1
    us=np.linspace(0,1,2001); v=np.where(us<1-brems,1.0,(1-us)/brems); s_=np.concatenate([[0],np.cumsum((v[1:]+v[:-1])/2*np.diff(us))]); s_/=s_[-1]
    return float(np.interp(u,us,s_))
def anlauf(u,a=0.12,brems=0.35):
    us=np.linspace(0,1,2001); v=np.minimum(np.minimum(us/a,1.0),(1-us)/brems); s_=np.concatenate([[0],np.cumsum((v[1:]+v[:-1])/2*np.diff(us))]); s_/=s_[-1]
    return float(np.interp(u,us,s_))
# Langsam (Daria, 2026-11-02): 12 s bis links, 6 s zurück nach Mitte rechts (x 560), dann 4 s ganz wenig nach links (x 535)
T_A,T_B,T_C=12.0,6.0,4.0; T1=T_A+T_B+T_C
X_END=535.0
def xb(t):
    if t<T_A: return 1040-(1040-210)*weg(t/T_A,0.12)
    if t<T_A+T_B: return 210+(560-210)*anlauf((t-T_A)/T_B)
    if t<T1:
        u=(t-T_A-T_B)/T_C; u=u*u*(3-2*u)
        return 560-(560-X_END)*u
    return X_END
def neig_faktor(t):
    e=T_A+T_B
    if t<e-1.5: return 1.0
    if t<e: return (e-t)/1.5
    return 0.0
# Neigung (Daria, 2026-11-02): schwächer und träge. Die Flasche ist am Bauch schwer, am Hals schmal und leicht;
# sie folgt der Steigung nur zu einem Drittel, mit Verzögerung, und taucht mit dem Hals weniger ein als mit dem Boden.
def neigung_roh(t):
    x=xb(t); sl=(surf(x+12,t)-surf(x-12,t))/24
    r=np.degrees(np.arctan(sl))*0.33
    if r<0: r*=0.55      # negativ = Hals (links) nach unten: der leichte Hals fängt ab
    return float(np.clip(r,-5,7))
def neigung(t):
    ws=[math.exp(-j*0.05/0.3) for j in range(14)]
    return sum(w*neigung_roh(t-j*0.05) for j,w in enumerate(ws))/sum(ws)
# Grundlage (Daria, 2026-11-02): Die Flasche liegt fast waagerecht. Gezeichnet liegt ihre Achse bei 37°, BASE dreht sie auf 10°.
BASE=-27.0
SINK=12.0   # flach liegend taucht sie etwas tiefer ein
# Organisch statt glatt: Die Flasche ist ein gedämpfter Körper, kein Zeiger. Sie wird von der Welle angestoßen,
# reagiert mit Verzögerung, schwingt kurz über und kommt zur Ruhe. Dazu kleine Störungen (Kräuselwellen, Böen),
# deren Perioden in 25,6 s aufgehen, damit die Schleife nahtlos bleibt.
P=25.6
STOER=[(P/3,2.2,0.4),(P/5,1.4,2.1),(P/7,0.9,4.0),(P/11,0.6,1.1)]       # Heben: Periode, Ausschlag px, Phase
STOER_R=[(P/4,0.8,0.7),(P/9,0.5,2.6),(P/13,0.35,5.2)]                  # Kippen: Periode, Grad, Phase
DRIFT=[(P,3.5,0.3),(P/2,1.8,1.9)]                                       # Wind: Periode, px, Phase
def summe(liste,t): return sum(a*math.sin(2*math.pi*t/per+ph) for per,a,ph in liste)
def ziel(t):
    x=xb(t); y=surf(x,t); sl=(surf(x+12,t)-surf(x-12,t))/24
    r=np.degrees(np.arctan(sl))*0.33
    if r<0: r*=0.55      # der leichte Hals fängt ab
    f=neig_faktor(t)
    heave=FOLLOW*(y-MEAN)+summe(STOER,t)
    rot=float(np.clip(r,-5,7))*f+summe(STOER_R,t)*(0.35+0.65*f)
    orbit=-dirf*FOLLOW*47*sl*f+summe(DRIFT,t)*(0.4+0.6*f)
    return x-X0+orbit, heave, rot
# Simulation: Heben träge (Eigenperiode 1,5 s, wenig Dämpfung), Kippen träger (2,1 s), seitlich fast direkt
DT=0.01; T_END=T1+2+4*P
ts=np.arange(0,T_END,DT); st=np.zeros((len(ts),3))
y=v=r=w=0.0; x0,y0,r0=ziel(0); y,r=y0,r0
OM_H,Z_H=2*math.pi/1.5,0.32; OM_R,Z_R=2*math.pi/2.1,0.22
for i,t in enumerate(ts):
    xx,yt,rt=ziel(t)
    v+= (OM_H**2*(yt-y)-2*Z_H*OM_H*v)*DT; y+=v*DT
    w+= (OM_R**2*(rt-r)-2*Z_R*OM_R*w)*DT; r+=w*DT
    st[i]=(xx,y,r)
def sim(t): 
    i=min(int(round(t/DT)),len(ts)-1); return st[i]
T_IN=T1+2.0      # Weg plus 2 s Ausklingen; die Schleife setzt im eingeschwungenen Zustand an
def zustand(t):
    if t<=T_IN:
        a=sim(t)
        if t>T_IN-1.5:   # sanft in den eingeschwungenen Takt überblenden
            u=(t-(T_IN-1.5))/1.5; u=u*u*(3-2*u); bz=sim(t+3*P); a=a*(1-u)+bz*u
        return a
    return sim(t+3*P)
def kf(name,t0,dur,step=0.1):
    n=int(round(dur/step)); out=[]
    for k in range(n+1):
        dx,dy,r=zustand(t0+k*step)
        out.append(f'{100*k/n:.3f}%{{transform:translate({dx:.1f}px,{dy+SINK:.1f}px) rotate({r+BASE:.2f}deg)}}')
    return f'@keyframes {name}{{'+''.join(out)+'}'
LOOP=P
css+=['.flasche{transform-box:view-box;transform-origin:500px 545px;animation:flasche-weg %.1fs linear forwards,flasche-auf-ab %.1fs linear %.1fs infinite}'%(T_IN,LOOP,T_IN),
kf('flasche-weg',0,T_IN),kf('flasche-auf-ab',T_IN,LOOP)]
css.append('@media (prefers-reduced-motion: reduce){*{animation:none!important}}')
R=lambda f,m: f'<rect x="0" y="380" width="870" height="460" {f} mask="url(#m-{m})"/>'
svg=f'''<svg width="870" height="819" viewBox="0 0 870 819" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<style>
{chr(10).join(css)}
</style>
{defs}
<defs>
<clipPath id="scheibe"><path d="{disc}"/></clipPath>
{chr(10).join(masks)}
</defs>
{img}
<g clip-path="url(#scheibe)">
{R(f_hinten,'hinten')}
{R(f_mitte,'mitte')}
<g class="flasche">
{flasche}
</g>
{R(f_vv[0],'vorn-verlauf')}
{R(f_vv[1],'vorn-verlauf')}
{R(f_vorn,'vorn')}
</g>
</svg>
'''
open(S+'Bottle Reward endlos.svg','w').write(svg)
print(len(svg)//1024,'KB')
