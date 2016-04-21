/* */ 
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
require('prismjs/components/prism-mel');
var core_1 = require('angular2/core');
var Mel = (function () {
    function Mel(el) {
        this.el = el;
    }
    Mel.prototype.ngOnInit = function () {
        this.codeblock = this.el.internalElement.componentView.context;
        this.codeblock.language = 'mel';
    };
    Mel = __decorate([
        core_1.Directive({
            selector: 'codeblock[mel]'
        }), 
        __metadata('design:paramtypes', [core_1.ElementRef])
    ], Mel);
    return Mel;
}());
exports.Mel = Mel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxRQUFPLDhCQUE4QixDQUFDLENBQUE7QUFDdEMscUJBQW9DLGVBQWUsQ0FBQyxDQUFBO0FBTXBEO0lBSUUsYUFBb0IsRUFBYTtRQUFiLE9BQUUsR0FBRixFQUFFLENBQVc7SUFBSyxDQUFDO0lBRXZDLHNCQUFRLEdBQVI7UUFFRSxJQUFJLENBQUMsU0FBUyxHQUFTLElBQUksQ0FBQyxFQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ2xDLENBQUM7SUFiSDtRQUFDLGdCQUFTLENBQUM7WUFDVCxRQUFRLEVBQUUsZ0JBQWdCO1NBQzNCLENBQUM7O1dBQUE7SUFhRixVQUFDO0FBQUQsQ0FBQyxBQVpELElBWUM7QUFaWSxXQUFHLE1BWWYsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAncHJpc21qcy9jb21wb25lbnRzL3ByaXNtLW1lbCc7XG5pbXBvcnQge0RpcmVjdGl2ZSwgRWxlbWVudFJlZn0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG5cblxuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnY29kZWJsb2NrW21lbF0nXG59KVxuZXhwb3J0IGNsYXNzIE1lbCB7XG5cbiAgY29kZWJsb2NrOmFueTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGVsOkVsZW1lbnRSZWYpIHsgIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBnZXQgdGhlIGhvc3RcbiAgICB0aGlzLmNvZGVibG9jayA9ICg8YW55PnRoaXMuZWwpLmludGVybmFsRWxlbWVudC5jb21wb25lbnRWaWV3LmNvbnRleHQ7XG4gICAgdGhpcy5jb2RlYmxvY2subGFuZ3VhZ2UgPSAnbWVsJztcbiAgfVxuXG59XG4iXX0=