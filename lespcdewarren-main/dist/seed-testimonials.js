"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var fs_1 = require("fs");
var path_1 = require("path");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var file, raw, items, data, inserted, _i, data_1, d, err_1, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = path_1.default.join(__dirname, '..', 'data', 'testimonials.json');
                    raw = fs_1.default.readFileSync(file, 'utf-8');
                    items = JSON.parse(raw);
                    data = items.map(function (i) { return ({
                        name: i.name,
                        country: i.country || null,
                        rating: Math.max(1, Math.min(5, Number(i.rating) || 5)),
                        title: i.title || null,
                        content: i.content || '',
                        experienceDate: i.experienceDate ? new Date(i.experienceDate) : null,
                        source: i.source || 'import',
                        published: i.published !== undefined ? !!i.published : true,
                        createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
                    }); });
                    console.log("Importing ".concat(data.length, " testimonials..."));
                    inserted = 0;
                    _i = 0, data_1 = data;
                    _a.label = 1;
                case 1:
                    if (!(_i < data_1.length)) return [3 /*break*/, 6];
                    d = data_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, prisma.testimonial.create({ data: d })];
                case 3:
                    _a.sent();
                    inserted += 1;
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    msg = String((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || err_1);
                    if (msg.includes('Unique') || msg.includes('duplicate') || msg.includes('already exists')) {
                        return [3 /*break*/, 5];
                    }
                    console.warn('Failed to insert testimonial:', msg);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log('Inserted:', inserted);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) { console.error(e); process.exit(1); }).finally(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, prisma.$disconnect()];
        case 1:
            _a.sent();
            return [2 /*return*/];
    }
}); }); });
