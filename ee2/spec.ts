import {browser} from 'protractor';
describe('Protractor Typescript Demo', async function() {
	it('title verifications', async function() {
		try{
	  await browser.get('https://angularjs.org/');
	  await browser.getTitle().then(function(title){
		console.log("The title is  : "+title)
		browser.sleep(5000);
	  });
	  
	}
	catch(err){
		console.log('error');
	}
	});
});