"""Misst Icon-Vektoren: Knoten, Griffe, Strecken, Unregelmäßigkeit, Dellen, Radien. Anleitung: Documentation, kiez-coins/design/Icons_zeichnen.md"""
import re, math, json, sys
import numpy as np
from svgpathtools import parse_path, Line, CubicBezier, QuadraticBezier
from shapely.geometry import Polygon, LineString, Point
from scipy.ndimage import gaussian_filter1d

ICON='/home/claude/kiez-coins-app/assets/icons/'; UB='/home/claude/kiez-coins-app/Übergabe/'
# Aufruf: python3 scripts/icons-messen.py ergebnis.json [datei.svg[#1,9,2] ...]
# Ohne Dateien misst es Darias Vorlagen. Hinter # stehen die Teilpfade, die zählen.
FILES=[('Kamera',ICON+'camera.svg',None),('Daumen hoch',ICON+'thumbs-up.svg',None),('Hallo',ICON+'hallo.svg',None),
       ('Diese Richtung',ICON+'this-way.svg',None),('Flasche (Default)',UB+'Property 1=Default.svg',[1,9,2,5,10])]

def ang(v): return math.degrees(math.atan2(v[1],v[0]))
def adiff(a,b):
    d=(a-b+180)%360-180; return abs(d)
def analyze_sub(sp, size):
    segs=list(sp); n=len(segs)
    P=[complex(s.start) for s in segs]
    nodes=[]
    for i,s in enumerate(segs):
        prev=segs[i-1]
        # Griffe: einlaufend (vom vorigen Segment), auslaufend (dieses Segment)
        if isinstance(prev,CubicBezier): hin=prev.end-prev.control2
        else: hin=prev.end-prev.start
        if isinstance(s,CubicBezier): hout=s.control1-s.start
        else: hout=s.end-s.start
        lin,lout=abs(hin),abs(hout)
        # Tangentenrichtung (bei eingezogenem Griff: Richtung zum nächsten Kontrollpunkt)
        def dirv(seg,start=True):
            if isinstance(seg,CubicBezier):
                pts=[seg.start,seg.control1,seg.control2,seg.end] if start else [seg.end,seg.control2,seg.control1,seg.start]
                for q in pts[1:]:
                    if abs(q-pts[0])>1e-6: return (q-pts[0]) if start else (pts[0]-q)
            return seg.end-seg.start
        tin=dirv(prev,False); tout=dirv(s,True)
        kink=adiff(ang((tin.real,tin.imag)),ang((tout.real,tout.imag)))
        nodes.append(dict(kink=kink,lin=lin/size,lout=lout/size,retr=(lin<1e-3*size) or (lout<1e-3*size),
                          ratio=(min(lin,lout)/max(lin,lout) if max(lin,lout)>0 else 1)))
    seginfo=[]
    for s in segs:
        L=s.length(); ch=abs(s.end-s.start)
        if isinstance(s,CubicBezier):
            h1=abs(s.control1-s.start)/ch if ch>0 else 0; h2=abs(s.end-s.control2)/ch if ch>0 else 0
            # Durchbiegung: größter Abstand der Kurve zur Sehne relativ zur Sehne
            ts=np.linspace(0,1,40); pts=np.array([s.point(t) for t in ts])
            if ch>0:
                u=(s.end-s.start)/ch; dev=np.abs(((pts-s.start)*np.conj(u)).imag); sag=dev.max()/ch
            else: sag=0
            # Wendepunkte
            d1=np.array([s.derivative(t) for t in ts]); d2=np.array([s.derivative(t,n=2) for t in ts])
            cr=(d1.real*d2.imag-d1.imag*d2.real); infl=int(np.sum(np.diff(np.sign(cr[np.abs(cr)>1e-9]))!=0))
        else: h1=h2=0; sag=0; infl=0
        seginfo.append(dict(L=L/size,h1=h1,h2=h2,sag=sag,infl=infl,line=not isinstance(s,CubicBezier)))
    return nodes, seginfo

def contour_pts(sp,n=1200):
    raw=np.array([(z.real,z.imag) for seg in sp for z in [seg.point(t) for t in np.linspace(0,1,30,endpoint=False)]])
    ls=LineString(np.vstack([raw,raw[:1]])); return np.array([[ls.interpolate(i/n,normalized=True).x,ls.interpolate(i/n,normalized=True).y] for i in range(n)]), ls.length

def salient(sp,size):
    pts,L=contour_pts(sp); n=len(pts); st=L/n
    a=gaussian_filter1d(pts,0.012*size/st,axis=0,mode='wrap'); b=gaussian_filter1d(pts,0.06*size/st,axis=0,mode='wrap')
    t=np.gradient(b,axis=0); t/=np.linalg.norm(t,axis=1)[:,None]; nrm=np.stack([-t[:,1],t[:,0]],1)
    r=((a-b)*nrm).sum(1)/size*100
    thr=2.5*np.abs(r).std()
    # Krümmung der groben Form
    th=np.unwrap(np.arctan2(t[:,1],t[:,0])); k=np.abs(np.gradient(th))/st*size  # 1/Radius in Icongrößen
    sal=np.abs(r)>thr
    # Gruppen auffälliger Stellen
    groups=[]; i=0
    while i<n:
        if sal[i]:
            j=i
            while j+1<n and sal[j+1]: j+=1
            seg=slice(i,j+1); groups.append(dict(len=(j-i+1)*st/size, amp=float(np.abs(r[seg]).max()), sign='Beule nach außen' if r[seg][np.argmax(np.abs(r[seg]))]>0 else 'Delle nach innen',
                 curv=float(np.median(k[seg]))))
            i=j+1
        else: i+=1
    straight=(k<1.5).mean()*100   # Radius > 2/3 Icongröße
    return groups, straight, float(np.abs(r).std()), float(thr)

def concavities(poly,size):
    hull=poly.convex_hull; diff=hull.difference(poly)
    out=[]
    for g in (diff.geoms if diff.geom_type=='MultiPolygon' else [diff]):
        if g.area<(0.002*size)**2*10: continue
        # Tiefe: größter Abstand eines Punktes der Delle zur Hülle
        depth=max(Point(c).distance(hull.exterior) for c in g.exterior.coords)
        mrr=g.minimum_rotated_rectangle; xx,yy=mrr.exterior.coords.xy
        e=sorted([math.dist((xx[i],yy[i]),(xx[i+1],yy[i+1])) for i in range(2)])
        out.append(dict(depth=depth/size, width=e[1]/size, area=g.area/size**2))
    return sorted(out,key=lambda x:-x['depth'])

def radii(sp,size):
    pts,L=contour_pts(sp); st=L/len(pts)
    b=gaussian_filter1d(pts,0.01*size/st,axis=0,mode='wrap'); t=np.gradient(b,axis=0); t/=np.linalg.norm(t,axis=1)[:,None]
    th=np.unwrap(np.arctan2(t[:,1],t[:,0])); k=np.gradient(th)/st
    # Ecken: lokale Maxima der Krümmung über 1/(0.15*size)
    ks=np.abs(k); res=[]
    for i in range(len(ks)):
        if ks[i]>1/(0.15*size) and ks[i]==ks[max(0,i-15):i+16].max():
            res.append((1/ks[i])/size*100)
    return sorted(res)

if len(sys.argv)>2:
    FILES=[]
    for a in sys.argv[2:]:
        f,_,p=a.partition('#'); FILES.append((f.split('/')[-1],f,[int(x) for x in p.split(',')] if p else None))
report={}
for name,f,pick in FILES:
    s=open(f).read(); W=float(re.search(r'width="([\d.]+)"',s).group(1)); H=float(re.search(r'height="([\d.]+)"',s).group(1)); size=max(W,H)
    subs=[]
    for d in re.findall(r' d="([^"]+)"',s):
        subs+=parse_path(d).continuous_subpaths()
    if pick: subs=[subs[i] for i in pick]
    R=[]
    for j,sp in enumerate(subs):
        nodes,seg=analyze_sub(sp,size)
        poly=Polygon([(z.real,z.imag) for x in sp for z in [x.point(t) for t in np.linspace(0,1,20,endpoint=False)]]).buffer(0)
        if poly.area<(0.05*size)**2: continue
        groups,straight,rms,thr=salient(sp,size)
        k=np.array([n_['kink'] for n_ in nodes]); L=np.array([x['L'] for x in seg])
        h=np.array([x['h1'] for x in seg if not x['line']]+[x['h2'] for x in seg if not x['line']])
        sag=np.array([x['sag'] for x in seg if not x['line']])
        R.append(dict(
          teil=j, knoten=len(nodes), linien=sum(x['line'] for x in seg),
          glatt=int((k<10).sum()), leichter_knick=int(((k>=10)&(k<35)).sum()), ecke=int((k>=35).sum()),
          eingezogen=int(sum(n_['retr'] for n_ in nodes)),
          griff_asym_median=float(np.median([n_['ratio'] for n_ in nodes])),
          seg_rel=dict(min=float(L.min()),p25=float(np.percentile(L,25)),median=float(np.median(L)),p75=float(np.percentile(L,75)),max=float(L.max())),
          lange_seg=int((L>0.15).sum()), kurze_seg=int((L<0.03).sum()),
          griff_rel_sehne=dict(p10=float(np.percentile(h,10)),median=float(np.median(h)),p90=float(np.percentile(h,90))) if len(h) else None,
          durchbiegung=dict(median=float(np.median(sag)),max=float(sag.max())) if len(sag) else None,
          wendepunkte=int(sum(x['infl'] for x in seg)),
          gerade_anteil=straight, unruhe_rms=rms,
          auffaellig=[dict(laenge=round(g['len']*100,1),staerke=round(g['amp'],2),art=g['sign']) for g in groups],
          dellen=[dict(tiefe=round(c['depth']*100,1),breite=round(c['width']*100,1)) for c in concavities(poly,size)[:8]],
          eckradien=[round(r,1) for r in radii(sp,size)][:12],
          flaeche_bbox=float(poly.area/(poly.envelope.area)),
        ))
    report[name]=dict(groesse=[W,H],teile=R)
json.dump(report,open(sys.argv[1],'w'),ensure_ascii=False,indent=1)
for name,v in report.items():
    print('=====',name,v['groesse'])
    for t in v['teile']:
        print(json.dumps(t,ensure_ascii=False))
