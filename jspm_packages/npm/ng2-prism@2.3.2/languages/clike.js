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
require('prismjs/components/prism-clike');
var core_1 = require('angular2/core');
var Clike = (function () {
    function Clike(el) {
        this.el = el;
    }
    Clike.prototype.ngOnInit = function () {
        this.codeblock = this.el.internalElement.componentView.context;
        this.codeblock.language = 'clike';
    };
    Clike = __decorate([
        core_1.Directive({
            selector: 'codeblock[clike]'
        }), 
        __metadata('design:paramtypes', [core_1.ElementRef])
    ], Clike);
    return Clike;
}());
exports.Clike = Clike;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpa2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGlrZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsUUFBTyxnQ0FBZ0MsQ0FBQyxDQUFBO0FBQ3hDLHFCQUFvQyxlQUFlLENBQUMsQ0FBQTtBQU1wRDtJQUlFLGVBQW9CLEVBQWE7UUFBYixPQUFFLEdBQUYsRUFBRSxDQUFXO0lBQUssQ0FBQztJQUV2Qyx3QkFBUSxHQUFSO1FBRUUsSUFBSSxDQUFDLFNBQVMsR0FBUyxJQUFJLENBQUMsRUFBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUNwQyxDQUFDO0lBYkg7UUFBQyxnQkFBUyxDQUFDO1lBQ1QsUUFBUSxFQUFFLGtCQUFrQjtTQUM3QixDQUFDOzthQUFBO0lBYUYsWUFBQztBQUFELENBQUMsQUFaRCxJQVlDO0FBWlksYUFBSyxRQVlqQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICdwcmlzbWpzL2NvbXBvbmVudHMvcHJpc20tY2xpa2UnO1xuaW1wb3J0IHtEaXJlY3RpdmUsIEVsZW1lbnRSZWZ9IGZyb20gJ2FuZ3VsYXIyL2NvcmUnO1xuXG5cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ2NvZGVibG9ja1tjbGlrZV0nXG59KVxuZXhwb3J0IGNsYXNzIENsaWtlIHtcblxuICBjb2RlYmxvY2s6YW55O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZWw6RWxlbWVudFJlZikgeyAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIGdldCB0aGUgaG9zdFxuICAgIHRoaXMuY29kZWJsb2NrID0gKDxhbnk+dGhpcy5lbCkuaW50ZXJuYWxFbGVtZW50LmNvbXBvbmVudFZpZXcuY29udGV4dDtcbiAgICB0aGlzLmNvZGVibG9jay5sYW5ndWFnZSA9ICdjbGlrZSc7XG4gIH1cblxufVxuIl19