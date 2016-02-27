import AbstractRenderer from "../AbstractRenderer";
import NodeBase from "../DisplayNodeBase";
import Node from "../DisplayNode";
import computeLayout_ from "css-layout";
import {rect,roundedRect1,roundedRect4,line,lineH,lineV,fillTextMultiline} from "./DrawUtils";
import {measureText} from "./MeasureUtils";

export default class CanvasRenderer extends AbstractRenderer {
    constructor(canvas){
        super();

        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._base = new NodeBase();
        this._base.size = [canvas.width, canvas.height];
        this._debugDraw = true;
    }

    computeLayout(){
        let ctx = this._ctx;
        this._base.updateLayoutNode();

        function measure(maxWidth = 0, maxHeight = 0){
            let layout = this._layoutNode.layout;
            let style = this._layoutNode.style;

            let borderWidth = style.borderWidth || 0;
            let fontSize = style.fontSize || 0;
            let paddingTop = style.paddingTop || 0;
            let paddingRight = style.paddingRight || 0;
            let paddingLeft = style.paddingLeft || 0;
            let paddingBottom = style.paddingBottom || 0;

            if(style.padding){
                paddingTop = paddingRight = paddingBottom = paddingLeft = style.padding;
            }

            ctx.font = `${fontSize}px ${style.fontFamily || 'Arial'}`;

            let width = 0;
            let height = 0;

            switch(style.whiteSpace){
                case 'nowrap':
                    width = ctx.measureText(this._textContent).width;
                    height = fontSize;
                    break;

                case 'normal':
                default:
                    let size = measureText(
                        ctx, this._textContent,{
                            fontSize : fontSize,
                            lineHeight : style.lineHeight,
                            maxWidth : Math.max(layout.width, maxWidth) - (paddingRight + paddingLeft + borderWidth * 2)
                        }
                    );
                    width = size.width;
                    height = size.height;
                    break;
            }

            return {
                width : Math.max(width, maxWidth),
                height : Math.max(height, maxHeight)
            };
        }

        function inject(node){
            let style = node.layoutNode.style;

            if(node.textContent && node.textContent.length !== 0){
                style.measure = measure.bind(node);
            }else if(style.measure){
                delete style.measure;
            }

            for(let child of node.children){
                inject(child);
            }
        }

        inject(this._base);
        computeLayout_(this._base._layoutNode);
    }

    drawNodeDebug(node){
        let ctx = this._ctx;

        let layout = node.layoutNode.layout;
        let style = node.layoutNode.style;

        function drawMargin(t, r = t, b = t, l = t){
            if(t === 0 || r === 0 || b === 0 || l === 0){
                return;
            }
            let centerV = layout.height * 0.5;
            let centerH = layout.width * 0.5;

            let handle = Math.min(Math.min(layout.width, layout.height), 20);
            let handleVA = centerV - handle * 0.5;
            let handleVB = centerV + handle * 0.5;
            let handleHA = centerH - handle * 0.5;
            let handleHB = centerH + handle * 0.5;

            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            lineV(ctx, -l, handleVA, handleVB);
            lineV(ctx, 0, handleVA, handleVB);
            lineH(ctx, -l, 0, centerV);
            lineV(ctx, layout.width + r, handleVA, handleVB);
            lineV(ctx, layout.width, handleVA, handleVB);
            lineH(ctx, layout.width, layout.width + r, centerV);
            lineH(ctx, handleHA, handleHB, -t);
            lineH(ctx, handleHA, handleHB, 0);
            lineV(ctx, centerH, -t, 0);
            lineH(ctx, handleHA, handleHB, layout.height);
            lineH(ctx, handleHA, handleHB, layout.height + b);
            lineV(ctx, centerH, layout.height, layout.height + b);
            ctx.stroke();

            ctx.strokeStyle = '#00ff00';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            rect(ctx, -l, -t, layout.width + r + l, layout.height + b + t);
            ctx.stroke();
        }

        function drawSize(inset){
            ctx.beginPath();
            if(style.borderRadius){
                roundedRect1(ctx, 0, 0, layout.width, layout.height, style.borderRadius, inset);
            }else{
                let tl = style.borderRadiusTopLeft || 0;
                let tr = style.borderRadiusTopRight || 0;
                let br = style.borderRadiusBottomRight || 0;
                let bl = style.borderRadiusBottomLeft || 0;

                if(tl === 0 && tr === 0 && br === 0 && bl === 0){
                    rect(ctx, 0, 0, layout.width, layout.height, inset);
                }else{
                    roundedRect4(ctx, 0, 0, layout.width, layout.height, tl, tr, br, bl, inset);
                }
            }
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(layout.left, layout.top);

        let borderWidth = style.borderWidth || 0;
        ctx.setLineDash([5, 5]);

        //padding all
        ctx.strokeStyle = '#00ff00';
        if(style.padding){
            let padding = style.padding + borderWidth;
            ctx.beginPath();
            lineH(ctx, 0, layout.width, padding);
            lineH(ctx, 0, layout.width, layout.height - padding);
            lineV(ctx, padding, 0, layout.height);
            lineV(ctx, layout.width - padding, 0, layout.height);
            ctx.stroke();

        //padding individual
        }else{
            ctx.beginPath();
            if(style.paddingTop){
                lineH(ctx, 0, layout.width, style.paddingTop + borderWidth);
            }
            if(style.paddingRight){
                lineV(ctx, layout.width - borderWidth - style.paddingRight, 0, layout.height);
            }
            if(style.paddingBottom){
                lineH(ctx, 0, layout.width, layout.height - style.paddingBottom - borderWidth);
            }
            if(style.paddingLeft){
                lineV(ctx, style.paddingLeft + borderWidth, 0, layout.height);
            }
            ctx.stroke();
        }

        //margin all
        ctx.strokeStyle = '#ff00ff';
        if(style.margin){
            drawMargin(style.margin);
        //margin individual
        }else{
            drawMargin(style.marginTop || 0, style.marginRight || 0, style.marginBottom || 0, style.marginLeft || 0)
        }

        ctx.setLineDash([]);

        ctx.strokeStyle = '#ffff00';
        if(style.borderWidth){
            ctx.lineWidth = style.borderWidth;
            drawSize(style.borderWidth);
            ctx.lineWidth = 1;
        }

        ctx.setLineDash([5, 5]);

        //dimension
        ctx.strokeStyle = '#ff0000';
        drawSize();

        //origin
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(0, 0, 5, 5);

        //text-content
        if(node.textContent && node.textContent.length != 0){
            let fontSize = style.fontSize || 0;
            let paddingTop = style.paddingTop || 0;
            let paddingRight = style.paddingRight || 0;
            let paddingLeft = style.paddingLeft || 0;
            let paddingBottom = style.paddingBottom || 0;

            if(style.padding){
                paddingTop = paddingRight = paddingBottom = paddingLeft = style.padding;
            }

            let x = borderWidth + paddingLeft;
            let y = borderWidth + paddingTop + fontSize - 2;

            ctx.font = `${fontSize}px ${style.fontFamily || 'Arial'}`;

            switch(style.whiteSpace){
                case 'nowrap':
                    ctx.fillText(node.textContent, x, y);
                    break;
                case 'normal':
                default:
                    fillTextMultiline(
                        ctx, node.textContent,
                        x, y, {
                            fontSize: fontSize,
                            lineHeight: style.lineHeight,
                            textAlign : style.textAlign,
                            maxWidth: layout.width - (paddingRight + paddingLeft + borderWidth * 2)
                        }
                    );
                    break;
            }
        }

        for(let child of node.children){
            this.drawNodeDebug(child);
        }
        ctx.restore();
    }

    draw(){
        this.computeLayout();
        let ctx = this._ctx;

        if(this._debugDraw){
            ctx.clearRect(0, 0, this._base.width, this._base.height);
            //console.log(this._base);
            this.drawNodeDebug(this._base);
            return;
        }

    }

}

//var AbstractRenderer = require('../AbstractRenderer');
//
//var Stage         = require('../Stage');
//var DisplayObject = require('../DisplayNode');
//
//function CanvasRenderer(canvas){
//    AbstractRenderer.call(this);
//
//    this._canvas = canvas;
//    this._ctx    = this._canvas.getContext('2d');
//    this._stage  = new Stage([this._canvas.width,this._canvas.height]);
//
//    this._redrawBounds = [];
//    this._layoutValid  = true;
//}
//
//CanvasRenderer.prototype = Object.create(AbstractRenderer.prototype);
//CanvasRenderer.prototype.constructor = CanvasRenderer;
//
//
//CanvasRenderer.prototype.createDisplayObject = function(){
//    return new DisplayObject();
//};
//
//CanvasRenderer.prototype.updateLayout = function(){};
//
//
//CanvasRenderer.prototype.drawBounds = function(bounds){
//    var ctx = this._ctx;
//
//    ctx.beginPath();
//    ctx.moveTo(bounds[0],bounds[1]);
//    ctx.lineTo(bounds[2],bounds[1]);
//    ctx.lineTo(bounds[2],bounds[3]);
//    ctx.lineTo(bounds[0],bounds[3]);
//    ctx.closePath();
//};
//
//CanvasRenderer.prototype.drawRoundedRect = function(x,y,width,height,radii){
//
//    //path.moveTo(x + radius, y);
//    //path.lineTo(x + width - radius, y);
//    //path.quadraticCurveTo(x + width, y, x + width, y + radius);
//    //path.lineTo(x + width, y + height - radius);
//    //path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
//    //path.lineTo(x + radius, y + height);
//    //path.quadraticCurveTo(x, y + height, x, y + height - radius);
//    //path.lineTo(x, y + radius);
//    //path.quadraticCurveTo(x, y, x + radius, y);
//};
//
//CanvasRenderer.prototype.drawRectStrokedFromBounds = function(bounds){
//    var x = bounds[0];
//    var y = bounds[1];
//    var width  = bounds[2] - x;
//    var height = bounds[3] - y;
//
//    this.drawRectStroked(x,y,width,height);
//};
//
//CanvasRenderer.prototype.drawRectStroked = function(x,y,width,height){
//    var ctx = this._ctx;
//    var strokeWidth = ctx.lineWidth;
//
//    var x0 = x + strokeWidth;
//    var y0 = y + strokeWidth;
//    var x1 = x + width - strokeWidth;
//    var y1 = y + height - strokeWidth;
//
//    ctx.beginPath();
//    ctx.moveTo(x0,y0);
//    ctx.lineTo(x1,y0);
//    ctx.lineTo(x1,y1);
//    ctx.lineTo(x0,y1);
//    ctx.closePath();
//
//    ctx.stroke();
//};
//
//CanvasRenderer.prototype.debugObject = function(obj){
//    var ctx = this._ctx;
//
//    ctx.strokeStyle = '#ff0000';
//    ctx.lineWidth   = 2;
//    this.drawBounds(obj.getBoundsGlobal());
//    ctx.stroke();
//
//    ctx.fillStyle = '#0000ff';
//    ctx.fillRect(obj.getPositionXAbsolute()-2,obj.getPositionYAbsolute()-2,4,4);
//};
//
//
//CanvasRenderer.prototype.drawObject = function(obj){
//    var ctx   = this._ctx;
//    var style = obj.getStyle();
//
//    var styleOverflow = style.overflow;
//    var masksChildren = false;
//
//    ctx.save();
//
//        if(styleOverflow){
//            switch (styleOverflow){
//                case 'visible' :
//                    break;
//
//                case 'hidden' :
//                    masksChildren = true;
//                    this.drawBounds(obj.getBoundsGlobal());
//                    ctx.clip();
//                    break;
//
//                case 'auto' :
//                    this.drawBounds(obj.getBoundsGlobal());
//                    ctx.clip();
//                    masksChildren = true;
//                    break;
//            }
//        }
//
//        this.debugObject(obj);
//        for(var i = 0, l = obj.getNumChildren(); i < l; ++i){
//            this.drawObject(obj.getChildAt(i));
//        }
//
//    ctx.restore();
//};
//
//CanvasRenderer.prototype.draw = function(){
//    var stage = this._stage;
//    for(var i = 0, l = stage.getNumChildren(); i < l; ++i){
//        this.drawObject(stage.getChildAt(i));
//    }
//};
//
//CanvasRenderer.prototype.onResize = function(e){
//    this._stage.handleResize(e);
//};
//
//module.exports = CanvasRenderer;