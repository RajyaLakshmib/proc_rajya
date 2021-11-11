var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 18476,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\008000f2-0041-0045-005c-00f600f600af.png",
        "timestamp": 1630821832795,
        "duration": 7397
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 10424,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\009700cb-0003-002d-0016-0040005c002b.png",
        "timestamp": 1630823007193,
        "duration": 7927
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 19056,
        "browser": {
            "name": "firefox",
            "version": "90.0.2"
        },
        "message": [
            "Failed: Angular could not be found on the page https://angularjs.org/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page https://angularjs.org/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"title verifications\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (C:\\proc_rajya\\spec.ts:3:2)\n    at step (C:\\proc_rajya\\spec.ts:33:23)\n    at Object.next (C:\\proc_rajya\\spec.ts:14:53)\n    at C:\\proc_rajya\\spec.ts:8:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\proc_rajya\\spec.ts:4:12)\n    at Suite.<anonymous> (C:\\proc_rajya\\spec.ts:41:12)\n    at addSpecsToSuite (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)"
        ],
        "browserLogs": [],
        "screenShotFile": "images\\00170037-0038-0085-0037-00dd009e00f6.png",
        "timestamp": 1630823008150,
        "duration": 11402
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4496,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00540043-00d3-002e-00de-0089009600ca.png",
        "timestamp": 1630823107726,
        "duration": 8126
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": false,
        "pending": false,
        "os": "windows",
        "instanceId": 8844,
        "browser": {
            "name": "firefox",
            "version": "90.0.2"
        },
        "message": [
            "Failed: Angular could not be found on the page https://angularjs.org/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page https://angularjs.org/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"title verifications\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (C:\\proc_rajya\\spec.ts:3:2)\n    at step (C:\\proc_rajya\\spec.ts:33:23)\n    at Object.next (C:\\proc_rajya\\spec.ts:14:53)\n    at C:\\proc_rajya\\spec.ts:8:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\proc_rajya\\spec.ts:4:12)\n    at Suite.<anonymous> (C:\\proc_rajya\\spec.ts:41:12)\n    at addSpecsToSuite (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajya Lakshmi\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)"
        ],
        "browserLogs": [],
        "screenShotFile": "images\\005c00b5-003d-000f-00af-000c00520056.png",
        "timestamp": 1630823110709,
        "duration": 10856
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 15040,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\002800b2-00fa-00a4-00fd-000900470011.png",
        "timestamp": 1630823220688,
        "duration": 7504
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 25224,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\005400b5-0012-001a-0050-0022002200cd.png",
        "timestamp": 1630824056217,
        "duration": 7639
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3476,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\005b0011-00f4-00d2-001e-00a600550071.png",
        "timestamp": 1630824436908,
        "duration": 7475
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 24180,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00100007-005d-0091-0019-00af001e005c.png",
        "timestamp": 1630996593310,
        "duration": 6797
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "39d51f857b9c467affbf481f785ee7b524fb33f0",
        "instanceId": 24864,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00300015-00fc-009b-00ec-00960033003c.png",
        "timestamp": 1630996699740,
        "duration": 16604
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "09b99260e612d86439cfc535cfa0afdc8990b4fb",
        "instanceId": 26856,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxK.woff2",
                "timestamp": 1631086627911,
                "type": ""
            },
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fBBc4.woff2",
                "timestamp": 1631086627913,
                "type": ""
            },
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmWUlfBBc4.woff2",
                "timestamp": 1631086627990,
                "type": ""
            },
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://angularjs.org/font/fontawesome-webfont.woff",
                "timestamp": 1631086627990,
                "type": ""
            },
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fBBc4.woff2",
                "timestamp": 1631086627991,
                "type": ""
            },
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://fonts.gstatic.com/s/roboto/v27/KFOkCnqEu92Fr1Mu51xIIzI.woff2",
                "timestamp": 1631086628486,
                "type": ""
            },
            {
                "level": "INFO",
                "message": "https://angularjs.org/ - Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu7GxKOzY.woff2",
                "timestamp": 1631086632756,
                "type": ""
            }
        ],
        "screenShotFile": "images\\00b800b8-008e-0026-0031-001900920000.png",
        "timestamp": 1631086626673,
        "duration": 13631
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "da3cba72fa92e8625bfb63dc96aed8feeccfa8a9",
        "instanceId": 24056,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00fa00cc-0051-0083-00e4-003d00c20063.png",
        "timestamp": 1631086971392,
        "duration": 15541
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 10692,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00bf0023-0048-00ac-000a-0034001c00a4.png",
        "timestamp": 1631087063532,
        "duration": 7699
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "57260459586480ed64a1f76c3e550e0a49b4ac26",
        "instanceId": 27932,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00eb0008-00e7-0014-0005-007e00d80024.png",
        "timestamp": 1631087403734,
        "duration": 14005
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "436f8994218a97d7e85f06893efb55ec6572a72c",
        "instanceId": 9500,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\003d0070-009e-0053-00c6-00bf0019009e.png",
        "timestamp": 1631087536562,
        "duration": 15838
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "7e4be426a33f96a56604aa17047ca6674a80a222",
        "instanceId": 18148,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00360019-00ea-00f2-0065-003900de00fd.png",
        "timestamp": 1631087910217,
        "duration": 15303
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "efb3b447de4f12e66764c74db6a6bde074e36a43",
        "instanceId": 7744,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\004900de-008a-0044-00a6-0050009100bf.png",
        "timestamp": 1631088064706,
        "duration": 15143
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "6cae1decffc00b4a0f110cf9a8c773e3167a67c5",
        "instanceId": 28972,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\007700f9-00c8-000d-0035-0044009d0076.png",
        "timestamp": 1631088213771,
        "duration": 8723
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "15c6ab04143bb33500acff505432a30082a1595e",
        "instanceId": 24880,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\0037002f-005d-0016-008e-001900cf0020.png",
        "timestamp": 1631341461585,
        "duration": 7876
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "7013bcc17f47ac812c80da4146debc5b091d01b3",
        "instanceId": 31544,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\0083000a-004c-0079-00d4-002d003d0073.png",
        "timestamp": 1631343419932,
        "duration": 10093
    },
    {
        "description": "title verifications|Protractor Typescript Demo",
        "passed": true,
        "pending": false,
        "os": "WINDOWS",
        "sessionId": "0aac9de085be2028d31d584e689201b3e4f6f4ef",
        "instanceId": 24668,
        "browser": {
            "name": "chrome",
            "version": "93.0.4577.63"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "images\\00b50006-005d-0012-0000-006a00130048.png",
        "timestamp": 1631343758487,
        "duration": 11532
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
