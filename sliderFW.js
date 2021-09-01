module.exports = function(app){
    var SliderFW = Object.getPrototypeOf(app).SliderFW = new app.Component("sliderFW");
    // SliderFW.debug = true;
    SliderFW.createdAt      = "2.0.0";
    SliderFW.lastUpdate     = "2.0.0";
    SliderFW.version        = "1";
    // SliderFW.factoryExclude = true;
    // SliderFW.loadingMsg     = "This message will display in the console when component will be loaded.";
    // SliderFW.requires       = [];

    // SliderFW.prototype.onCreate = function(){
    // do thing after element's creation
    // }
    return SliderFW;
}