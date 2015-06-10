/**
 * Created by Clay Chai on 2015/6/5.
 */

function GetHeader(src) {
    var ForReading=1;
    var fr = new FileReader();
    var f=fr.OpenTextFile(src,ForReading);
    return(f.ReadAll());
}

var debug_on_server = true;
/*
* IES file format
* [TEST] 测试报表的编号及实验室(必须包括)
* [MANUFAC] 灯具制造商(必须包括)
* [LUMCAT] 灯具型录号码
* [LUMINAIRE] 灯具描述
* [LAMPCAT] 灯管型录号码
* [LAMP] 用在光度测定报表中的灯管描述
* 必须要关键词[TEST]及[MANUFAC]
*
*
* */


var IES = {version:0.1};
IES.TYPES = {
    IES_1986:0,
    IES_1991:1,
    IES_1995:2,
    IES_2002:3
};

IES.PhotometryType = {
    C:1,
    B:2,
    A:3
};

IES.Units = {
    Feet:1,
    Meters:2
};

IES.SAMPLES = {};

IES.SAMPLES.s1 ="IESNA91\n\
[TEST]     Test unknown\n\
[MANUFAC]  Manufacturing company unknown\n\
TILT=NONE\n\
1 13.09 1\n\
8 16\n\
1\n\
2\n\
0 0 0\n\
1 1 0\n\
0.00 15.98 38.85 83.29 128.25 150.99 167.49 180.00\n\
0.00 24.48 47.33 67.41 90.00 112.59 132.67 155.52 180.00 204.48 227.33 247.41 270.00 292.59 312.67 335.52\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87\n\
0.36 1.74 2.07 0.50 0.54 1.68 1.80 0.87";

ies_folder = "F:\\Yuntian_Chai\\IES_Parser2\\ies\\";

// @ name: Sphere Point:(x,y,z) to (lat,lon) coordinates
function sp2latlon(x,y,z,radius)
{
    radius = radius||1;
    var ll = {};
    ll.x = Math.acos(y/radius);//latitude
    ll.y = Math.asin(x/z);//longitude
    return ll;
}

function ParseIdentifier(id)
{
    var id_regex = /IESNA/g;

    var suc = id.match(id_regex);

    if(suc) {
        switch (id) {
            case "IESNA91":
                return IES.TYPES.IES_1991
                break;
            case "IESNA:LM-63-1991":
                return IES.TYPES.IES_1991
                break;
            case "IESNA:LM-63-1995":
                return IES.TYPES.IES_1995
                break;
            case "IESNA:LM-63-2002":
                // FIXME unable to find documentation on this format
                return IES.TYPES.IES_2002;
                break;
            default:
                console.error("IES file format not recognized!");
                return undefined;
        }
    }
    else {
        return IES.TYPES.IES_1986;
    }

}

function ExtractDataZone(str)
{
    var exp = /TILT *= *NONE[\s\S]+/g;
    var suc = str.match(exp);
    if(suc){
        s = suc[0].replace(/TILT=NONE\r*\n/,"");
        s = s.replace(/( *\r*\n+ *| +)/g,",");
        s = s.replace(/,$/g,"");
        console.log(s);
        return s.split(",");
    }
}

function ToFloatArr(arr)
{
   ret = [];
    for(var i=0;i<arr.length;i++)
    {
        ret.push(parseFloat(arr[i]));
    }
    return ret;
}


var FindMaxCD = function(cdArr)
{
    max = 0;
    for(var i=0;i<cdArr.length;i++)
    {
        if(cdArr[i]>max){
            max = cdArr[i];
        }
    }
    return max;

}


function binarySearch(items, value){

    var start = 0,
        end = items.length - 1;

    if(value<items[start]){
        return start;

    }
    else if(value>items[end])
    {
        return end;
    }

    while(true){
        middle = Math.floor((end + start)/2);
//adjust search area
        if (value < items[middle]){
            if(end == middle){return middle;}
            end = middle ;
        } else if (value > items[middle]){
            if(start == middle){return middle;}
            start = middle ;
        }
        //console.log([start,end,middle]);
        if(items[middle] == value || start >= end){
            start = end;
            return start;
        }

    }
//make sure it's the right value
}

function lerp(s,e,a){
    var d = e-s;
    return d*a+s;
}

function InterpolateBilinear(f,fx,fy)
{
    var x = Math.floor(fx);
    var y = Math.floor(fy);

    var fracX = fx-x;
    var fracY = fy-y;

    var p00 = f(x  ,y  );
    var p10 = f(x+1,y  );
    var p01 = f(x  ,y+1);
    var p11 = f(x+1,y+1);

    var p0 = lerp(p00,p01,fracY);
    var p1 = lerp(p10,p11,fracY);

    return lerp(p0,p1,fracX);

}

function ComputeFilterPosition(value,sortedValues){
    var N = sortedValues.length;
    if(N==0){return -1;}
    if(value<sortedValues[0]){return 0;}
    if(value>sortedValues[N-1]){return N-1;}
    var leftIndex = binarySearch(sortedValues,value);
    var rightIndex = leftIndex+1;
    var leftValue = sortedValues[leftIndex];
    var frac = 0.0;

    if(rightIndex<N){
        var rightValue = sortedValues[rightIndex];
        var delta = rightValue - leftValue;
        //if(delta>0.0001) {frac = (value - leftValue) / delta;}
        if(delta>0.0000000001){frac = (value - leftValue) / delta;}
    }
    return leftIndex+frac;
}

function Interpolate2D(ha,va,haArr,vaArr,cdArr){
    var u = ComputeFilterPosition(ha,haArr);
    var v = ComputeFilterPosition(va,vaArr);
    var w = haArr.length;
    var h = vaArr.length;
    var result = InterpolateBilinear(function(x,y){
        return GetCDValue(cdArr,x,y,w,h);
    },u,v);

    return result;
}

function GetCDValue(cdarr,x,y,w,h){return cdarr[y+h*x];}


function ReadIESString(data)
{
    var a=ExtractDataZone(data);
    //console.log(a);

    var par = {};
    var nv = parseInt(a[3]);
    var nh = parseInt(a[4]);

    var dt = a.slice(13);
    var v_angles = dt.slice(0,nv);
    var h_angles = dt.slice(nv,nv+nh);

    var candelas = dt.slice(nv+nh);

    var bValid = (dt.length == nv+nh+nv*nh);
    if(!bValid){return null;}

    par.N_Vertical = nv;
    par.N_Horizontal = nh;

    par.v_angles = ToFloatArr(v_angles);
    par.h_angles = ToFloatArr(h_angles);
    par.candelas = ToFloatArr(candelas);
    par.max_cd = FindMaxCD(par.candelas);
    console.log(par);
    console.log(bValid);
    return a;
}



function drawLine(ctx,sx,sy,ex,ey,width){
    width = width || 1.0;
    ctx.strokeStyle='red';
    ctx.lineWidth=width;
    ctx.lineCap='square';
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.lineTo(ex,ey);
    ctx.stroke();
    ctx.closePath();

}

function drawGrids(ctx,tb,lb,offsetx,offsety){
    var x = tb.x||0.0;
    var y = tb.y||0.0;
    var w = tb.w||0.0;
    var h = tb.h||0.0;
    var nx = tb.nx||0.0;
    var ny = tb.ny||0.0;

    var dx = w/nx;
    var dy = h/ny;

    // label tags
    var ux = lb.x||0.0;
    var uy = lb.y||0.0;
    var uw = lb.w||0.0;
    var uh = lb.h||0.0;

    var ux_xo = lb.xxo||0.0;
    var ux_yo = lb.xyo||0.0;

    var uy_xo = lb.yxo||0.0;
    var uy_yo = lb.yyo||0.0;


    var udx = uw/nx;
    var udy = uh/ny;

    var i,j;
    // draw horizontal lines

    for(i=0;i<=ny;i++)
    {
        var cy = y+i*dy;
        drawLine(ctx,x,cy,x+w,cy);

        var x_label = uy+udy*i;
        drawText(ctx,x_label.toString(),x+w+ux_xo,cy+ux_yo,8);
    }

    // draw vertical lines
    for(j=0;j<=nx;j++)
    {
        var cx = x+j*dx;
        drawLine(ctx,cx,y,cx,y+h);

        var y_label = ux+udx*j;
        drawText(ctx,y_label.toString(),cx+uy_xo,y+h+8+uy_yo,8);
    }

    // draw texts
}

function drawText(ctx,ctn,x,y,fsize){

    fsize = fsize||"8px";
    ctx.font = "8px Courier New";
    ctx.fillStyle = "red";
    ctx.fillText(ctn, x,y);
}




function RenderIESToTexture(pars,cvs,w,h)
{
    var vaArr = pars.v_angles;
    var haArr = pars.h_angles;
    var cds = pars.candelas;
    var maxcd = pars.max_cd;
    //w = w || 256;
    //h = h || 256;

    wi = 1.0 / w; // width inversed.
    hi = 1.0 / h; // height inversed.

    var invmax = 1.0/maxcd;

    console.log(invmax);


    var ctx=cvs.getContext("2d");
    var imgData=ctx.createImageData(w,h);

    temp = [];
    for (var x=0;x<w;x++){
        for(var y=0;y<h;y++){
            var idx = 4*(x+y*w);

            var fracX = parseFloat(x*wi);
            var fracY = parseFloat(y*hi);
            var ha = fracX*360.0;
            var va = fracY*180.0;
            var pix01 = Interpolate2D(ha,va,haArr,vaArr,cds)*invmax;
            temp.push(pix01);

            var pix255 = parseInt(pix01*255.0);

            imgData.data[idx]=pix255;
            imgData.data[idx+1]=pix255;
            imgData.data[idx+2]=pix255;
            imgData.data[idx+3]=255;
        }
    }

    var offsetx = 0;
    var offsety = 0;
    ctx.putImageData(imgData,offsetx,offsety);

    drawGrids(ctx,{x:offsetx,y:offsety,w:w-offsetx*2,h:h-offsety*2,nx:10,ny:10},{x:0,y:0,w:360,h:180});

    console.log(temp);

}

//var a = ExtractDataZone(IES.SAMPLES.s1);

//console.log(a);

//ReadIESFile(ies_folder+"BE1839"+".IES");


//function add(x,y){return x+y;}

//var result = InterpolateBilinear(add,0.3,0.2);

//console.log(result);

//pos = ComputeFilterPosition(3.3,[1,2,3,4,5,6,7,8]);

//console.log(pos);

