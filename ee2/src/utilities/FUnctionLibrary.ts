import { browser, protractor, by, until, ExpectedConditions } from "protractor";
import { Constants } from './Constants';
let fs = require("fs");
let randomString = require("random-string");

export class FunctionLibrary{
    static async switchToFrame(no : any){
        await browser.switchTo().frame(no);
    }
    static async switchToMainPage(){
        await browser.switchTo().defaultContent();
    }
    static async switchToTab(tabno : any){
        await browser.getWimdowHandles().then(async function (handles){
            var target = handles[tabno];
            await browser.switchTo().window(target).then(function () {
                browser.getCurrentUrl().then(function(url){
                    console.log("tab url:"+url);

                });
            });
        });
    }
    static async waitForElementPresent(ele : any, text : string){
        try{
            let EC = protractor.ExpectedConditions;
            let timeout = Constants.seconds30;
            await browser.wait(EC.textToBePresentInElement(ele,text),timeout,'Error wait for text to be present in element');

        }catch(err){
            console.log(err);
        }
    }
    static async waitForElementToBeVisible(ele : any){
        try{
            let EC = protractor.ExpectedConditions;
            let timeout = Constants.second30;
            await browser.wait(EC.visibilityOf(ele),timeout,'Error wait for element to be visible');
        }catch(err){
            console.log(err);
        }

    }
    static async dragAndDropElement(ele1 : any, ele2 : any){
        try{
            await browser.actions().
            dragAndDrop(ele1,ele2).
            perform();
        }catch(err){
            console.log(err);
        }
    }
    static async waitForElementClickable(ele : any){
        try{
            let EC = protractor.ExpectedConditions;
            let timeout = Constants.seconds30;
            await browser.wait(EC.elementToBeClickable(ele),timeout,'Error wait for element to be clickable');

        }catch(err){
            console.log(err);
        }
    }
    static async scrollToElement(ele : any){
        try{
            await browser.executeScript(
                "arguments[0].scrollIntoView(true)",
                ele.getWebElement()
            );
            await browser.sleep(1000);
        }catch(err){
            console.log("scroll to ele error"+err);
        }
    }
    static async pressEnterKey(){
        try{
            await browser.actions().sendKeys(protractor.Key.ENTER).perform();
        }catch(err){

        }
    }
    static async scrollToBottom(){
        try{
            await browser.executeScript('window.scrollTo(0,document.body.scrollHeight)');
        }catch(err){ }
    }
    static async click(ele : any){
        try{
        let EC = protractor.ExpectedConditions;
        let timeout =Constants.seconds30;
        await browser.wait(
            EC.elementToBeClickable(ele),
            timeout,
            "ele not clickable within"+ timeout
        );
        return ele.click();
        }catch(err){}
    }
    static async executeJs(script : string){
        try{
            await browser.executeScript(script);
            await browser.sleep(5000);
        }catch(err){}
    }
    static async setTextUsingJs(ele : any, text : string){
        await browser.executeScript("argument[0].value='"+text+"'",ele);
    }
    static async clickUsingJs(ele : any){
        try{
            if(!ele.isEnable()){
                return;
            }
            await FunctionLibrary.scrollToElement(ele);
            await browser.executeScript("argument[0].click();",ele.getWebElement());
            await browser.sleep(20000);
        }catch(err){
            console.log();
        }
    }
    static async getRandomAlphaNumericString(length : any){
        try{
            let random13chars = function(){
                return(
                    Math.random()
                    .toString(36)
                    .substring(2,15) +
                    Math.random()
                    .toString(36)
                    .substring(2,15)
                );
            };
            let loops = Math.ceil(length/13);
            return new Array(loops)
            .fill(random13chars)
            .reduce((string, func)=>{
                return string+func();
            },"")
            .substring(0,length);
        }catch(err){

        }
    }
    


}
