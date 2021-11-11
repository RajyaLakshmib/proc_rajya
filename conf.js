//const { browser } = require('protractor');
var HtmlReporter = require("protractor-beautiful-reporter");
exports.config={
    SELENIUM_PROMISE_MANAGER: false,
    allScriptTimeout: 500000,
    //directConnect: true,
    //seleniumAddress: 'http://localhost:4444/wd/hub',
    // multiCapabilities:[
    //     {
    //         browserName:'firefox'
    //     },
    //     {
    //         browserName: 'chrome'
    //     }
    // ],
    capabilities: {
        browserName : 'chrome',
        build: "stage-protractor-browserstack",
        "browserstack.local": false,
        name: 'Diagnostic_e2e_automation',
        shardTestFiles: true,
        maxInstances: 3,
        os: "windows",
        os_version: "10",
        resolution: '1920x1080',
        "browserstack.timezone":"Melbourne",
        "browserstack.debug": "true",
        "browserstack.console": "verbose",
        "browserstack.networkLogs":"true"
    },
    framework: 'jasmine2',
    // jasmineNodeOpts: {
    //     showTiming: true,
    //     showColors:true,
    //     isverbose:false,
    //     includeStackTrace:true,
    //     defaultTimeoutInterval:600000
    // },
    specs: ['./ee2/spec.ts'],
    // browserstackUser:"rajyalakshmi",
    // browserstackKey:"FZ8nyvtp5xQ7JY8ALnU8",
    browserstackUser:"prabhjotkaur4",
    browserstackKey:"MQpW8a8GKULuKsGQaTsH",
    onPrepare(){
        require('ts-node').register({
            project:'tsconfig.json'
        });
        jasmine.getEnv().addReporter(
            new HtmlReporter({
                baseDirectory: "reportpages",
                preserveDirectory: true, //If false this would delete any dirs setup in geforeLaunch
                screenshotsSubfolder: "images",
                cleanDestination: false

            }).getJasmine2Reporter()
        );
        browser.driver.manage().window().maximize();
    }
};