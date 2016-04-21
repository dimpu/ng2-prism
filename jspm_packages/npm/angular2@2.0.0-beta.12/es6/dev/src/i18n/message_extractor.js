/* */ 
"format esm";
import { ParseError } from 'angular2/src/compiler/parse_util';
import { HtmlElementAst, HtmlCommentAst, htmlVisitAll } from 'angular2/src/compiler/html_ast';
import { isPresent, isBlank } from 'angular2/src/facade/lang';
import { StringMapWrapper } from 'angular2/src/facade/collection';
import { Message, id } from './message';
const I18N_ATTR = "i18n";
const I18N_ATTR_PREFIX = "i18n-";
/**
 * All messages extracted from a template.
 */
export class ExtractionResult {
    constructor(messages, errors) {
        this.messages = messages;
        this.errors = errors;
    }
}
/**
 * An extraction error.
 */
export class I18nExtractionError extends ParseError {
    constructor(span, msg) {
        super(span, msg);
    }
}
/**
 * Removes duplicate messages.
 *
 * E.g.
 *
 * ```
 *  var m = [new Message("message", "meaning", "desc1"), new Message("message", "meaning",
 * "desc2")];
 *  expect(removeDuplicates(m)).toEqual([new Message("message", "meaning", "desc1")]);
 * ```
 */
export function removeDuplicates(messages) {
    let uniq = {};
    messages.forEach(m => {
        if (!StringMapWrapper.contains(uniq, id(m))) {
            uniq[id(m)] = m;
        }
    });
    return StringMapWrapper.values(uniq);
}
/**
 * Extracts all messages from a template.
 *
 * It works like this. First, the extractor uses the provided html parser to get
 * the html AST of the template. Then it partitions the root nodes into parts.
 * Everything between two i18n comments becomes a single part. Every other nodes becomes
 * a part too.
 *
 * We process every part as follows. Say we have a part A.
 *
 * If the part has the i18n attribute, it gets converted into a message.
 * And we do not recurse into that part, except to extract messages from the attributes.
 *
 * If the part doesn't have the i18n attribute, we recurse into that part and
 * partition its children.
 *
 * While walking the AST we also remove i18n attributes from messages.
 */
export class MessageExtractor {
    constructor(_htmlParser, _parser) {
        this._htmlParser = _htmlParser;
        this._parser = _parser;
    }
    extract(template, sourceUrl) {
        this.messages = [];
        this.errors = [];
        let res = this._htmlParser.parse(template, sourceUrl);
        if (res.errors.length > 0) {
            return new ExtractionResult([], res.errors);
        }
        else {
            let ps = this._partition(res.rootNodes);
            ps.forEach(p => this._extractMessagesFromPart(p));
            return new ExtractionResult(this.messages, this.errors);
        }
    }
    _extractMessagesFromPart(p) {
        if (p.hasI18n) {
            this.messages.push(new Message(_stringifyNodes(p.children, this._parser), _meaning(p.i18n), _description(p.i18n)));
            this._recurseToExtractMessagesFromAttributes(p.children);
        }
        else {
            this._recurse(p.children);
        }
        if (isPresent(p.rootElement)) {
            this._extractMessagesFromAttributes(p.rootElement);
        }
    }
    _recurse(nodes) {
        let ps = this._partition(nodes);
        ps.forEach(p => this._extractMessagesFromPart(p));
    }
    _recurseToExtractMessagesFromAttributes(nodes) {
        nodes.forEach(n => {
            if (n instanceof HtmlElementAst) {
                this._extractMessagesFromAttributes(n);
                this._recurseToExtractMessagesFromAttributes(n.children);
            }
        });
    }
    _extractMessagesFromAttributes(p) {
        p.attrs.forEach(attr => {
            if (attr.name.startsWith(I18N_ATTR_PREFIX)) {
                let expectedName = attr.name.substring(5);
                let matching = p.attrs.filter(a => a.name == expectedName);
                if (matching.length > 0) {
                    let value = _removeInterpolation(matching[0].value, p.sourceSpan, this._parser);
                    this.messages.push(new Message(value, _meaning(attr.value), _description(attr.value)));
                }
                else {
                    this.errors.push(new I18nExtractionError(p.sourceSpan, `Missing attribute '${expectedName}'.`));
                }
            }
        });
    }
    // Man, this is so ugly!
    _partition(nodes) {
        let res = [];
        for (let i = 0; i < nodes.length; ++i) {
            let n = nodes[i];
            let temp = [];
            if (_isOpeningComment(n)) {
                let i18n = n.value.substring(5).trim();
                i++;
                while (!_isClosingComment(nodes[i])) {
                    temp.push(nodes[i++]);
                    if (i === nodes.length) {
                        this.errors.push(new I18nExtractionError(n.sourceSpan, "Missing closing 'i18n' comment."));
                        break;
                    }
                }
                res.push(new _Part(null, temp, i18n, true));
            }
            else if (n instanceof HtmlElementAst) {
                let i18n = _findI18nAttr(n);
                res.push(new _Part(n, n.children, isPresent(i18n) ? i18n.value : null, isPresent(i18n)));
            }
        }
        return res;
    }
}
class _Part {
    constructor(rootElement, children, i18n, hasI18n) {
        this.rootElement = rootElement;
        this.children = children;
        this.i18n = i18n;
        this.hasI18n = hasI18n;
    }
}
function _isOpeningComment(n) {
    return n instanceof HtmlCommentAst && isPresent(n.value) && n.value.startsWith("i18n:");
}
function _isClosingComment(n) {
    return n instanceof HtmlCommentAst && isPresent(n.value) && n.value == "/i18n";
}
function _stringifyNodes(nodes, parser) {
    let visitor = new _StringifyVisitor(parser);
    return htmlVisitAll(visitor, nodes).join("");
}
class _StringifyVisitor {
    constructor(_parser) {
        this._parser = _parser;
    }
    visitElement(ast, context) {
        let attrs = this._join(htmlVisitAll(this, ast.attrs), " ");
        let children = this._join(htmlVisitAll(this, ast.children), "");
        return `<${ast.name} ${attrs}>${children}</${ast.name}>`;
    }
    visitAttr(ast, context) {
        if (ast.name.startsWith(I18N_ATTR_PREFIX)) {
            return "";
        }
        else {
            return `${ast.name}="${ast.value}"`;
        }
    }
    visitText(ast, context) {
        return _removeInterpolation(ast.value, ast.sourceSpan, this._parser);
    }
    visitComment(ast, context) { return ""; }
    _join(strs, str) {
        return strs.filter(s => s.length > 0).join(str);
    }
}
function _removeInterpolation(value, source, parser) {
    try {
        let parsed = parser.parseInterpolation(value, source.toString());
        if (isPresent(parsed)) {
            let ast = parsed.ast;
            let res = "";
            for (let i = 0; i < ast.strings.length; ++i) {
                res += ast.strings[i];
                if (i != ast.strings.length - 1) {
                    res += `{{I${i}}}`;
                }
            }
            return res;
        }
        else {
            return value;
        }
    }
    catch (e) {
        return value;
    }
}
function _findI18nAttr(p) {
    let i18n = p.attrs.filter(a => a.name == I18N_ATTR);
    return i18n.length == 0 ? null : i18n[0];
}
function _meaning(i18n) {
    if (isBlank(i18n) || i18n == "")
        return null;
    return i18n.split("|")[0];
}
function _description(i18n) {
    if (isBlank(i18n) || i18n == "")
        return null;
    let parts = i18n.split("|");
    return parts.length > 1 ? parts[1] : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZV9leHRyYWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmd1bGFyMi9zcmMvaTE4bi9tZXNzYWdlX2V4dHJhY3Rvci50cyJdLCJuYW1lcyI6WyJFeHRyYWN0aW9uUmVzdWx0IiwiRXh0cmFjdGlvblJlc3VsdC5jb25zdHJ1Y3RvciIsIkkxOG5FeHRyYWN0aW9uRXJyb3IiLCJJMThuRXh0cmFjdGlvbkVycm9yLmNvbnN0cnVjdG9yIiwicmVtb3ZlRHVwbGljYXRlcyIsIk1lc3NhZ2VFeHRyYWN0b3IiLCJNZXNzYWdlRXh0cmFjdG9yLmNvbnN0cnVjdG9yIiwiTWVzc2FnZUV4dHJhY3Rvci5leHRyYWN0IiwiTWVzc2FnZUV4dHJhY3Rvci5fZXh0cmFjdE1lc3NhZ2VzRnJvbVBhcnQiLCJNZXNzYWdlRXh0cmFjdG9yLl9yZWN1cnNlIiwiTWVzc2FnZUV4dHJhY3Rvci5fcmVjdXJzZVRvRXh0cmFjdE1lc3NhZ2VzRnJvbUF0dHJpYnV0ZXMiLCJNZXNzYWdlRXh0cmFjdG9yLl9leHRyYWN0TWVzc2FnZXNGcm9tQXR0cmlidXRlcyIsIk1lc3NhZ2VFeHRyYWN0b3IuX3BhcnRpdGlvbiIsIl9QYXJ0IiwiX1BhcnQuY29uc3RydWN0b3IiLCJfaXNPcGVuaW5nQ29tbWVudCIsIl9pc0Nsb3NpbmdDb21tZW50IiwiX3N0cmluZ2lmeU5vZGVzIiwiX1N0cmluZ2lmeVZpc2l0b3IiLCJfU3RyaW5naWZ5VmlzaXRvci5jb25zdHJ1Y3RvciIsIl9TdHJpbmdpZnlWaXNpdG9yLnZpc2l0RWxlbWVudCIsIl9TdHJpbmdpZnlWaXNpdG9yLnZpc2l0QXR0ciIsIl9TdHJpbmdpZnlWaXNpdG9yLnZpc2l0VGV4dCIsIl9TdHJpbmdpZnlWaXNpdG9yLnZpc2l0Q29tbWVudCIsIl9TdHJpbmdpZnlWaXNpdG9yLl9qb2luIiwiX3JlbW92ZUludGVycG9sYXRpb24iLCJfZmluZEkxOG5BdHRyIiwiX21lYW5pbmciLCJfZGVzY3JpcHRpb24iXSwibWFwcGluZ3Mi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dUJBQXVCLENBQWlCO0lBQ3RDQyxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxTQUFTQSxDQUFDQSxDQUFDQTtJQUNwREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDM0NBLENBQUNBO0FBRUQsa0JBQWtCLElBQVk7SUFDNUJDLEVBQUVBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBO1FBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO0lBQzdDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUM1QkEsQ0FBQ0E7QUFFRCxzQkFBc0IsSUFBWTtJQUNoQ0MsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsSUFBSUEsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7SUFDN0NBLElBQUlBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO0lBQzVCQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtBQUM1Q0EsQ0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0h0bWxQYXJzZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb21waWxlci9odG1sX3BhcnNlcic7XG5pbXBvcnQge1BhcnNlU291cmNlU3BhbiwgUGFyc2VFcnJvcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3BhcnNlX3V0aWwnO1xuaW1wb3J0IHtcbiAgSHRtbEFzdCxcbiAgSHRtbEFzdFZpc2l0b3IsXG4gIEh0bWxFbGVtZW50QXN0LFxuICBIdG1sQXR0ckFzdCxcbiAgSHRtbFRleHRBc3QsXG4gIEh0bWxDb21tZW50QXN0LFxuICBodG1sVmlzaXRBbGxcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvbXBpbGVyL2h0bWxfYXN0JztcbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtTdHJpbmdNYXBXcmFwcGVyfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtQYXJzZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2NoYW5nZV9kZXRlY3Rpb24vcGFyc2VyL3BhcnNlcic7XG5pbXBvcnQge0ludGVycG9sYXRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2NoYW5nZV9kZXRlY3Rpb24vcGFyc2VyL2FzdCc7XG5pbXBvcnQge01lc3NhZ2UsIGlkfSBmcm9tICcuL21lc3NhZ2UnO1xuXG5jb25zdCBJMThOX0FUVFIgPSBcImkxOG5cIjtcbmNvbnN0IEkxOE5fQVRUUl9QUkVGSVggPSBcImkxOG4tXCI7XG5cbi8qKlxuICogQWxsIG1lc3NhZ2VzIGV4dHJhY3RlZCBmcm9tIGEgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBFeHRyYWN0aW9uUmVzdWx0IHtcbiAgY29uc3RydWN0b3IocHVibGljIG1lc3NhZ2VzOiBNZXNzYWdlW10sIHB1YmxpYyBlcnJvcnM6IFBhcnNlRXJyb3JbXSkge31cbn1cblxuLyoqXG4gKiBBbiBleHRyYWN0aW9uIGVycm9yLlxuICovXG5leHBvcnQgY2xhc3MgSTE4bkV4dHJhY3Rpb25FcnJvciBleHRlbmRzIFBhcnNlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihzcGFuOiBQYXJzZVNvdXJjZVNwYW4sIG1zZzogc3RyaW5nKSB7IHN1cGVyKHNwYW4sIG1zZyk7IH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGR1cGxpY2F0ZSBtZXNzYWdlcy5cbiAqXG4gKiBFLmcuXG4gKlxuICogYGBgXG4gKiAgdmFyIG0gPSBbbmV3IE1lc3NhZ2UoXCJtZXNzYWdlXCIsIFwibWVhbmluZ1wiLCBcImRlc2MxXCIpLCBuZXcgTWVzc2FnZShcIm1lc3NhZ2VcIiwgXCJtZWFuaW5nXCIsXG4gKiBcImRlc2MyXCIpXTtcbiAqICBleHBlY3QocmVtb3ZlRHVwbGljYXRlcyhtKSkudG9FcXVhbChbbmV3IE1lc3NhZ2UoXCJtZXNzYWdlXCIsIFwibWVhbmluZ1wiLCBcImRlc2MxXCIpXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUR1cGxpY2F0ZXMobWVzc2FnZXM6IE1lc3NhZ2VbXSk6IE1lc3NhZ2VbXSB7XG4gIGxldCB1bmlxOiB7W2tleTogc3RyaW5nXTogTWVzc2FnZX0gPSB7fTtcbiAgbWVzc2FnZXMuZm9yRWFjaChtID0+IHtcbiAgICBpZiAoIVN0cmluZ01hcFdyYXBwZXIuY29udGFpbnModW5pcSwgaWQobSkpKSB7XG4gICAgICB1bmlxW2lkKG0pXSA9IG07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIFN0cmluZ01hcFdyYXBwZXIudmFsdWVzKHVuaXEpO1xufVxuXG4vKipcbiAqIEV4dHJhY3RzIGFsbCBtZXNzYWdlcyBmcm9tIGEgdGVtcGxhdGUuXG4gKlxuICogSXQgd29ya3MgbGlrZSB0aGlzLiBGaXJzdCwgdGhlIGV4dHJhY3RvciB1c2VzIHRoZSBwcm92aWRlZCBodG1sIHBhcnNlciB0byBnZXRcbiAqIHRoZSBodG1sIEFTVCBvZiB0aGUgdGVtcGxhdGUuIFRoZW4gaXQgcGFydGl0aW9ucyB0aGUgcm9vdCBub2RlcyBpbnRvIHBhcnRzLlxuICogRXZlcnl0aGluZyBiZXR3ZWVuIHR3byBpMThuIGNvbW1lbnRzIGJlY29tZXMgYSBzaW5nbGUgcGFydC4gRXZlcnkgb3RoZXIgbm9kZXMgYmVjb21lc1xuICogYSBwYXJ0IHRvby5cbiAqXG4gKiBXZSBwcm9jZXNzIGV2ZXJ5IHBhcnQgYXMgZm9sbG93cy4gU2F5IHdlIGhhdmUgYSBwYXJ0IEEuXG4gKlxuICogSWYgdGhlIHBhcnQgaGFzIHRoZSBpMThuIGF0dHJpYnV0ZSwgaXQgZ2V0cyBjb252ZXJ0ZWQgaW50byBhIG1lc3NhZ2UuXG4gKiBBbmQgd2UgZG8gbm90IHJlY3Vyc2UgaW50byB0aGF0IHBhcnQsIGV4Y2VwdCB0byBleHRyYWN0IG1lc3NhZ2VzIGZyb20gdGhlIGF0dHJpYnV0ZXMuXG4gKlxuICogSWYgdGhlIHBhcnQgZG9lc24ndCBoYXZlIHRoZSBpMThuIGF0dHJpYnV0ZSwgd2UgcmVjdXJzZSBpbnRvIHRoYXQgcGFydCBhbmRcbiAqIHBhcnRpdGlvbiBpdHMgY2hpbGRyZW4uXG4gKlxuICogV2hpbGUgd2Fsa2luZyB0aGUgQVNUIHdlIGFsc28gcmVtb3ZlIGkxOG4gYXR0cmlidXRlcyBmcm9tIG1lc3NhZ2VzLlxuICovXG5leHBvcnQgY2xhc3MgTWVzc2FnZUV4dHJhY3RvciB7XG4gIG1lc3NhZ2VzOiBNZXNzYWdlW107XG4gIGVycm9yczogUGFyc2VFcnJvcltdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX2h0bWxQYXJzZXI6IEh0bWxQYXJzZXIsIHByaXZhdGUgX3BhcnNlcjogUGFyc2VyKSB7fVxuXG4gIGV4dHJhY3QodGVtcGxhdGU6IHN0cmluZywgc291cmNlVXJsOiBzdHJpbmcpOiBFeHRyYWN0aW9uUmVzdWx0IHtcbiAgICB0aGlzLm1lc3NhZ2VzID0gW107XG4gICAgdGhpcy5lcnJvcnMgPSBbXTtcblxuICAgIGxldCByZXMgPSB0aGlzLl9odG1sUGFyc2VyLnBhcnNlKHRlbXBsYXRlLCBzb3VyY2VVcmwpO1xuICAgIGlmIChyZXMuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBuZXcgRXh0cmFjdGlvblJlc3VsdChbXSwgcmVzLmVycm9ycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBwcyA9IHRoaXMuX3BhcnRpdGlvbihyZXMucm9vdE5vZGVzKTtcbiAgICAgIHBzLmZvckVhY2gocCA9PiB0aGlzLl9leHRyYWN0TWVzc2FnZXNGcm9tUGFydChwKSk7XG4gICAgICByZXR1cm4gbmV3IEV4dHJhY3Rpb25SZXN1bHQodGhpcy5tZXNzYWdlcywgdGhpcy5lcnJvcnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RNZXNzYWdlc0Zyb21QYXJ0KHA6IF9QYXJ0KTogdm9pZCB7XG4gICAgaWYgKHAuaGFzSTE4bikge1xuICAgICAgdGhpcy5tZXNzYWdlcy5wdXNoKG5ldyBNZXNzYWdlKF9zdHJpbmdpZnlOb2RlcyhwLmNoaWxkcmVuLCB0aGlzLl9wYXJzZXIpLCBfbWVhbmluZyhwLmkxOG4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kZXNjcmlwdGlvbihwLmkxOG4pKSk7XG4gICAgICB0aGlzLl9yZWN1cnNlVG9FeHRyYWN0TWVzc2FnZXNGcm9tQXR0cmlidXRlcyhwLmNoaWxkcmVuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcmVjdXJzZShwLmNoaWxkcmVuKTtcbiAgICB9XG5cbiAgICBpZiAoaXNQcmVzZW50KHAucm9vdEVsZW1lbnQpKSB7XG4gICAgICB0aGlzLl9leHRyYWN0TWVzc2FnZXNGcm9tQXR0cmlidXRlcyhwLnJvb3RFbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZWN1cnNlKG5vZGVzOiBIdG1sQXN0W10pOiB2b2lkIHtcbiAgICBsZXQgcHMgPSB0aGlzLl9wYXJ0aXRpb24obm9kZXMpO1xuICAgIHBzLmZvckVhY2gocCA9PiB0aGlzLl9leHRyYWN0TWVzc2FnZXNGcm9tUGFydChwKSk7XG4gIH1cblxuICBwcml2YXRlIF9yZWN1cnNlVG9FeHRyYWN0TWVzc2FnZXNGcm9tQXR0cmlidXRlcyhub2RlczogSHRtbEFzdFtdKTogdm9pZCB7XG4gICAgbm9kZXMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmIChuIGluc3RhbmNlb2YgSHRtbEVsZW1lbnRBc3QpIHtcbiAgICAgICAgdGhpcy5fZXh0cmFjdE1lc3NhZ2VzRnJvbUF0dHJpYnV0ZXMobik7XG4gICAgICAgIHRoaXMuX3JlY3Vyc2VUb0V4dHJhY3RNZXNzYWdlc0Zyb21BdHRyaWJ1dGVzKG4uY2hpbGRyZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdE1lc3NhZ2VzRnJvbUF0dHJpYnV0ZXMocDogSHRtbEVsZW1lbnRBc3QpOiB2b2lkIHtcbiAgICBwLmF0dHJzLmZvckVhY2goYXR0ciA9PiB7XG4gICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgoSTE4Tl9BVFRSX1BSRUZJWCkpIHtcbiAgICAgICAgbGV0IGV4cGVjdGVkTmFtZSA9IGF0dHIubmFtZS5zdWJzdHJpbmcoNSk7XG4gICAgICAgIGxldCBtYXRjaGluZyA9IHAuYXR0cnMuZmlsdGVyKGEgPT4gYS5uYW1lID09IGV4cGVjdGVkTmFtZSk7XG5cbiAgICAgICAgaWYgKG1hdGNoaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsZXQgdmFsdWUgPSBfcmVtb3ZlSW50ZXJwb2xhdGlvbihtYXRjaGluZ1swXS52YWx1ZSwgcC5zb3VyY2VTcGFuLCB0aGlzLl9wYXJzZXIpO1xuICAgICAgICAgIHRoaXMubWVzc2FnZXMucHVzaChuZXcgTWVzc2FnZSh2YWx1ZSwgX21lYW5pbmcoYXR0ci52YWx1ZSksIF9kZXNjcmlwdGlvbihhdHRyLnZhbHVlKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuZXJyb3JzLnB1c2goXG4gICAgICAgICAgICAgIG5ldyBJMThuRXh0cmFjdGlvbkVycm9yKHAuc291cmNlU3BhbiwgYE1pc3NpbmcgYXR0cmlidXRlICcke2V4cGVjdGVkTmFtZX0nLmApKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gTWFuLCB0aGlzIGlzIHNvIHVnbHkhXG4gIHByaXZhdGUgX3BhcnRpdGlvbihub2RlczogSHRtbEFzdFtdKTogX1BhcnRbXSB7XG4gICAgbGV0IHJlcyA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7ICsraSkge1xuICAgICAgbGV0IG4gPSBub2Rlc1tpXTtcbiAgICAgIGxldCB0ZW1wID0gW107XG4gICAgICBpZiAoX2lzT3BlbmluZ0NvbW1lbnQobikpIHtcbiAgICAgICAgbGV0IGkxOG4gPSAoPEh0bWxDb21tZW50QXN0Pm4pLnZhbHVlLnN1YnN0cmluZyg1KS50cmltKCk7XG4gICAgICAgIGkrKztcbiAgICAgICAgd2hpbGUgKCFfaXNDbG9zaW5nQ29tbWVudChub2Rlc1tpXSkpIHtcbiAgICAgICAgICB0ZW1wLnB1c2gobm9kZXNbaSsrXSk7XG4gICAgICAgICAgaWYgKGkgPT09IG5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5lcnJvcnMucHVzaChcbiAgICAgICAgICAgICAgICBuZXcgSTE4bkV4dHJhY3Rpb25FcnJvcihuLnNvdXJjZVNwYW4sIFwiTWlzc2luZyBjbG9zaW5nICdpMThuJyBjb21tZW50LlwiKSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnB1c2gobmV3IF9QYXJ0KG51bGwsIHRlbXAsIGkxOG4sIHRydWUpKTtcblxuICAgICAgfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgSHRtbEVsZW1lbnRBc3QpIHtcbiAgICAgICAgbGV0IGkxOG4gPSBfZmluZEkxOG5BdHRyKG4pO1xuICAgICAgICByZXMucHVzaChuZXcgX1BhcnQobiwgbi5jaGlsZHJlbiwgaXNQcmVzZW50KGkxOG4pID8gaTE4bi52YWx1ZSA6IG51bGwsIGlzUHJlc2VudChpMThuKSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cbn1cblxuY2xhc3MgX1BhcnQge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcm9vdEVsZW1lbnQ6IEh0bWxFbGVtZW50QXN0LCBwdWJsaWMgY2hpbGRyZW46IEh0bWxBc3RbXSwgcHVibGljIGkxOG46IHN0cmluZyxcbiAgICAgICAgICAgICAgcHVibGljIGhhc0kxOG46IGJvb2xlYW4pIHt9XG59XG5cbmZ1bmN0aW9uIF9pc09wZW5pbmdDb21tZW50KG46IEh0bWxBc3QpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBIdG1sQ29tbWVudEFzdCAmJiBpc1ByZXNlbnQobi52YWx1ZSkgJiYgbi52YWx1ZS5zdGFydHNXaXRoKFwiaTE4bjpcIik7XG59XG5cbmZ1bmN0aW9uIF9pc0Nsb3NpbmdDb21tZW50KG46IEh0bWxBc3QpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBIdG1sQ29tbWVudEFzdCAmJiBpc1ByZXNlbnQobi52YWx1ZSkgJiYgbi52YWx1ZSA9PSBcIi9pMThuXCI7XG59XG5cbmZ1bmN0aW9uIF9zdHJpbmdpZnlOb2Rlcyhub2RlczogSHRtbEFzdFtdLCBwYXJzZXI6IFBhcnNlcikge1xuICBsZXQgdmlzaXRvciA9IG5ldyBfU3RyaW5naWZ5VmlzaXRvcihwYXJzZXIpO1xuICByZXR1cm4gaHRtbFZpc2l0QWxsKHZpc2l0b3IsIG5vZGVzKS5qb2luKFwiXCIpO1xufVxuXG5jbGFzcyBfU3RyaW5naWZ5VmlzaXRvciBpbXBsZW1lbnRzIEh0bWxBc3RWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfcGFyc2VyOiBQYXJzZXIpIHt9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogSHRtbEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgbGV0IGF0dHJzID0gdGhpcy5fam9pbihodG1sVmlzaXRBbGwodGhpcywgYXN0LmF0dHJzKSwgXCIgXCIpO1xuICAgIGxldCBjaGlsZHJlbiA9IHRoaXMuX2pvaW4oaHRtbFZpc2l0QWxsKHRoaXMsIGFzdC5jaGlsZHJlbiksIFwiXCIpO1xuICAgIHJldHVybiBgPCR7YXN0Lm5hbWV9ICR7YXR0cnN9PiR7Y2hpbGRyZW59PC8ke2FzdC5uYW1lfT5gO1xuICB9XG5cbiAgdmlzaXRBdHRyKGFzdDogSHRtbEF0dHJBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgaWYgKGFzdC5uYW1lLnN0YXJ0c1dpdGgoSTE4Tl9BVFRSX1BSRUZJWCkpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYCR7YXN0Lm5hbWV9PVwiJHthc3QudmFsdWV9XCJgO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0VGV4dChhc3Q6IEh0bWxUZXh0QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBfcmVtb3ZlSW50ZXJwb2xhdGlvbihhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLCB0aGlzLl9wYXJzZXIpO1xuICB9XG5cbiAgdmlzaXRDb21tZW50KGFzdDogSHRtbENvbW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7IHJldHVybiBcIlwiOyB9XG5cbiAgcHJpdmF0ZSBfam9pbihzdHJzOiBzdHJpbmdbXSwgc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzdHJzLmZpbHRlcihzID0+IHMubGVuZ3RoID4gMCkuam9pbihzdHIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9yZW1vdmVJbnRlcnBvbGF0aW9uKHZhbHVlOiBzdHJpbmcsIHNvdXJjZTogUGFyc2VTb3VyY2VTcGFuLCBwYXJzZXI6IFBhcnNlcik6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgbGV0IHBhcnNlZCA9IHBhcnNlci5wYXJzZUludGVycG9sYXRpb24odmFsdWUsIHNvdXJjZS50b1N0cmluZygpKTtcbiAgICBpZiAoaXNQcmVzZW50KHBhcnNlZCkpIHtcbiAgICAgIGxldCBhc3Q6IEludGVycG9sYXRpb24gPSA8YW55PnBhcnNlZC5hc3Q7XG4gICAgICBsZXQgcmVzID0gXCJcIjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LnN0cmluZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcmVzICs9IGFzdC5zdHJpbmdzW2ldO1xuICAgICAgICBpZiAoaSAhPSBhc3Quc3RyaW5ncy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgcmVzICs9IGB7e0kke2l9fX1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9maW5kSTE4bkF0dHIocDogSHRtbEVsZW1lbnRBc3QpOiBIdG1sQXR0ckFzdCB7XG4gIGxldCBpMThuID0gcC5hdHRycy5maWx0ZXIoYSA9PiBhLm5hbWUgPT0gSTE4Tl9BVFRSKTtcbiAgcmV0dXJuIGkxOG4ubGVuZ3RoID09IDAgPyBudWxsIDogaTE4blswXTtcbn1cblxuZnVuY3Rpb24gX21lYW5pbmcoaTE4bjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQmxhbmsoaTE4bikgfHwgaTE4biA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIGkxOG4uc3BsaXQoXCJ8XCIpWzBdO1xufVxuXG5mdW5jdGlvbiBfZGVzY3JpcHRpb24oaTE4bjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQmxhbmsoaTE4bikgfHwgaTE4biA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgbGV0IHBhcnRzID0gaTE4bi5zcGxpdChcInxcIik7XG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPiAxID8gcGFydHNbMV0gOiBudWxsO1xufSJdfQ==