module.exports = function(){
    let Slider = Object.getPrototypeOf(fw).Slider = class Slider extends fw.Component{
        static {
            this.debug = true;
            this.createdAt  = "3.0.0";
            this.lastUpdate = "3.0.0";
            this.version = "1.0.0";
            this.tpl = utils.htmlToNode(require('bundle-tpl:./slider.html')).outerHTML;

            this.transitionStep       = 1;
            this.transitionDuration   = '500ms';
            this.transitionFunction   = 'ease';
            this.itemsPerRow          = 2;
            this.itemsGap             = '1em';

            this.observeCssChanges = true;
            this.checkItemsPerRow  = true;

            this.handlerTransition__translate = function(e){
                let slider = e.target.closest('.slider').component ?? false;
                if (!slider) return false;
                if (e.propertyName == 'translate') {
                    slider.moving = false;
                    slider.el.classList.remove('moving');
                    slider.log('End of transition. Currently on: '+ slider.current);
                    var shiftPosition = function(){ 
                        // fails when changing the number of items per row, need rework
                        return new Promise(function(resolve,reject){
                            if (slider.current == 0) {
                                slider.syncCssValue('--item-active', 'current', slider.itemsPerRow + (slider.items.length - slider.itemsLast.length));
                                slider.log('hiting back of the track, go to ' + slider.current);
                            }
                            else if (slider.current == slider.items.length+slider.itemsPerRow) {
                                slider.syncCssValue('--item-active', 'current', slider.itemsPerRow);
                                slider.log('hiting end of the track, go to ' + slider.current);
                            }
                            setTimeout(function(){
                                resolve();
                            })
                        });
                    }
                    var doBefore = (slider.loop == true) ? shiftPosition() : Promise.resolve();
                    doBefore.then(e=>{
                        if (slider.queue.length){
                            slider[slider.queue.shift()]();
                        } else if(slider.auto){
                            clearTimeout(slider.timerAuto);
                            slider.autoTrigger();
                        } 
                    })
                }
            };

            this.handlerTransition__fade = function(e){
                let item = this;
                let slider = e.target.closest('.slider').component ?? false;
                if (!slider) return false;
                if (item.classList.contains('slider__item') && item.classList.contains('active')  && e.propertyName == 'opacity') {
                   slider.moving = false;
                   slider.el.classList.remove('moving');
                   slider.log('End of transition. Currently on: '+ slider.current);

                   if (slider.queue.length){
                       slider[slider.queue.shift()]();
                   } else if(slider.auto){
                       clearTimeout(slider.timerAuto);
                       slider.autoTrigger();
                   } 
                }
            };

            // this.describe();
        }
        onCreate(){
            let slider = this;
            slider.log('onCreate start');

            slider.wrapper   = slider.el.querySelector('.slider__wrapper') ?? utils.htmlToNode('<div class="slider__wrapper"></div>');
            slider.items     = slider.el.querySelectorAll('.slider__item');
            slider.moving    = false;
            slider.current   = 0;
            slider.direction = 'next';
            slider.queue     = [];

            slider.keypress   = slider.getData('keypress',true);
            slider.loop       = slider.getData('loop',true);
            slider.auto       = slider.getData('auto',false);
            slider.delay      = parseInt(slider.getData('delay',4000));
            slider.mode       = slider.getData('mode','slider');
            slider.transition = slider.getData('transition-type','translate');
            
            slider.transitionDuration  = slider.getData('transition-duration', Slider.transitionDuration);
            slider.transitionFunction  = slider.getData('transition-function', Slider.transitionFunction);
            slider.transitionStep      = parseInt(slider.getData('transition-step', Slider.transitionStep));
            slider.itemsPerRow         = parseInt(slider.getData('items-per-row', Slider.itemsPerRow));
            slider.itemsGap            = slider.getData('items-gap', Slider.itemsGap);
            slider.itemsMinWidth       = parseInt(slider.getData('items-minwidth',0));
            
            // set wrapper
            slider.el.setAttribute('data-transition-type',slider.transition);
            slider.el.append(slider.wrapper);
            slider.items.forEach((el)=>{
                slider.wrapper.append(el)
            })

            if (Slider.observeCssChanges) {
                slider.observer = new MutationObserver(function(mutations) {
                    mutations.forEach( function (mutation) {
                        if (mutation.attributeName == "style") {
                            let diff = [];
                            for(var p of mutation.oldValue.split(';').map(item => item.trim())){
                                if (p.split(':')[1]){
                                    p = p.split(':').map(item => item.trim());
                                    if (slider.el.style.getPropertyValue(p[0]) != p[1])
                                        diff.push(p[0])
                                } 
                            }
                            if (diff.fw__containsAny(['--items-per-row','--transition-step'])){
                                slider.log('Recorded change on: '+diff);
                                slider.initSetup()
                            }
                        }
                    });
                });
            }
            slider.initSetup().then(()=>{
                slider.itemsPerRow_ref = slider.itemsPerRow;
                slider.step_ref        = slider.step;
                slider.adjustItemsPerRow();
            });

            // set user action events
            if (slider.keypress)
                document.addEventListener('keyup',e=>{ slider.keyEvent(e);});

            slider.el.classList.add('loaded');
            slider.log('onCreate ended','',false);
        }

        initSetup(){
            let slider = this;
            return new Promise(function(resolve,reject){
                slider.log('initSetup','',true)
                // reset
                if (Slider.observeCssChanges)
                    slider.observer.disconnect();
                slider.moving = false;
                slider.el.classList.remove('moving');
                slider.queue = [];

                // set properties for carrousel mode 
                if (slider.mode == "carrousel") {
                    // slider.loop = true;
                    slider.delay = 0;
                    slider.auto = true;
                    slider.transitionFunction = 'linear';
                    slider.transition = 'translate';
                    slider.el.setAttribute('data-transition-type','translate');
                }

                // set forced properties for each transitions
                if (slider.transition == 'fade') {
                    slider.itemsPerRow = 1;
                    slider.transitionStep = 1;
                }
                if (slider.transition == 'none') {
                    slider.transitionDuration = '1ms';
                    slider.transitionFunction = 'linear';
                }

                // set items
                if (slider.itemsPerRow < 1) 
                    slider.itemsPerRow = 1;
                if (slider.itemsPerRow > slider.items.length) 
                    slider.itemsPerRow = slider.items.length;
                if (slider.transitionStep > slider.itemsPerRow)
                    slider.transitionStep = slider.itemsPerRow;
                if (slider.mode == "carrousel") 
                    slider.transitionStep = slider.items.length;
                if (!slider.loop) {
                    if (slider.transitionStep > slider.items.length - slider.itemsPerRow)
                        slider.transitionStep = slider.items.length - slider.itemsPerRow;
                }
                if (slider.transitionStep <= 0) 
                    slider.transitionStep = 1;

                // set loop things
                slider.el.querySelectorAll('.dupe').forEach((el)=>{el.remove()});
                if (slider.loop && slider.transition != 'fade') {
                    slider.itemsFirst = Array.from(slider.items).slice(0,slider.itemsPerRow);
                    for(var item of slider.itemsFirst){
                        let itemClone = item.cloneNode(true);
                        itemClone.classList.add('dupe','firsts');
                        slider.wrapper.append(itemClone);
                    }
                    slider.itemsLast = Array.from(slider.items).slice(slider.items.length - slider.itemsPerRow);
                    for(var item of slider.itemsLast.reverse()){
                        let itemClone = item.cloneNode(true);
                        itemClone.classList.add('dupe','lasts');
                        slider.wrapper.prepend(itemClone);
                    }
                    slider.current = slider.itemsPerRow;
                }


                // set css custom properties
                slider.syncCssValue('--transition-duration',   'transitionDuration',  slider.transitionDuration);
                slider.syncCssValue('--transition-function',   'transitionFunction',  slider.transitionFunction);
                slider.syncCssValue('--transition-step',       'transitionStep',      slider.transitionStep);
                slider.syncCssValue('--items-per-row',         'itemsPerRow',         slider.itemsPerRow);
                slider.syncCssValue('--items-gap',             'itemsGap',            slider.itemsGap);
                slider.syncCssValue('--item-active',           'current',             slider.current);

                // manage animated state 
                slider.setTransitions();

                // set auto trigger
                if(slider.auto){
                    slider.timerAuto;
                    slider.autoTrigger();
                }

                if (Slider.observeCssChanges)
                    slider.observer.observe(slider.el, {attributes: true, childList: false, characterData: true, subtree:false, attributeFilter: ["style"], attributeOldValue : true}); 

                resolve()
            });
        }

        adjustItemsPerRow(){
            if (!Slider.checkItemsPerRow)
                return false;
            let slider = this;
            // need a function converting css units to px, to include items gap into calculation
            slider.log('adjustItemsPerRow');
            let wrapperWidth = slider.wrapper.offsetWidth;
            let availableSpace = wrapperWidth / slider.itemsMinWidth - slider.itemsPerRow;
            if (availableSpace < 0) {
                // console.log('no room to display so much items, need to reduce items per row' );
                slider.itemsPerRow = wrapperWidth > slider.itemsMinWidth ? Math.floor(wrapperWidth / slider.itemsMinWidth) : 1;
                if (slider.transitionStep > slider.itemsPerRow)
                    slider.transitionStep = slider.itemsPerRow; 
                // slider.syncCssValue('--items-per-row',         'itemsPerRow',         slider.itemsPerRow);
                // slider.syncCssValue('--transition-step',       'transitionStep',      slider.transitionStep);
            } else{
                // console.log('slider has room for more items per row');
                 if(slider.itemsPerRow < slider.itemsPerRow_ref){
                    // console.log('need to pump up the number of items per row to match the initial config');
                    slider.itemsPerRow = wrapperWidth > slider.itemsMinWidth ? Math.floor(wrapperWidth / slider.itemsMinWidth) : 1;
                    if (slider.itemsPerRow > slider.itemsPerRow_ref)
                        slider.itemsPerRow = slider.itemsPerRow_ref;
                    if (slider.transitionStep < slider.transitionStep_ref) {
                        slider.transitionStep = slider.transitionStep_ref
                        if (slider.transitionStep > slider.itemsPerRow)
                            slider.transitionStep = slider.itemsPerRow
                    }
                    // slider.syncCssValue('--items-per-row',         'itemsPerRow',         slider.itemsPerRow);
                    // slider.syncCssValue('--transition-step',       'transitionStep',      slider.transitionStep);
                 }
            }
            slider.syncCssValue('--items-per-row',         'itemsPerRow',         slider.itemsPerRow);
            slider.syncCssValue('--transition-step',       'transitionStep',      slider.transitionStep);

            // console.log('itemsPerRow', slider.itemsPerRow);
            // console.log('step', slider.transitionStep);
        }

        syncCssValue(cssVarName,objectVarName,value){
            this.setCssProperty(cssVarName, value);
            this[objectVarName] = value;
        }

        onResize(){
            this.log('onResize');
            this.adjustItemsPerRow();
        }

        next(){
            if (!this.moving) {
                this.direction = 'next';
                let target = 0;
                // translate, none
                if(this.loop)
                    target = this.current + this.transitionStep <= this.items.length + this.itemsPerRow ? this.current + this.transitionStep : this.items.length + this.itemsPerRow;
                else
                    target = this.items.length - (this.current + this.transitionStep) >= this.itemsPerRow ? this.current + this.transitionStep : this.current + (this.items.length - (this.current + this.itemsPerRow));

                if(this.transition == 'fade'){
                    if(this.loop)
                        target = this.current + this.transitionStep < this.items.length ? this.current + this.transitionStep : 0;
                    else
                        target = this.current + this.transitionStep < this.items.length ? this.current + this.transitionStep : this.current;
                }
                this.log('Next, targeting: '+target);
                this.moveTo(target);
            }  else {
                this.log('queue next');
                this.queue[0]='next';
            }
            return this; 
        }
        prev(){
            if (!this.moving) {
                this.direction = 'prev';

                let target;
                // translate, none
                target = (this.current - this.transitionStep >= 0 ? this.current - this.transitionStep : 0);
                
                if(this.transition == 'fade'){
                    target = (this.current - this.transitionStep >= 0 ? this.current - this.transitionStep : (this.loop ? target = this.items.length-1 : 0));
                }
                
                this.log('Prev, targeting: '+target);
                this.moveTo(target)
            } else {
                this.log('queue prev');
                this.queue[0]='prev';
            }
            return this; 
        }

        moveTo(index=0){
            if (index != this.current) {
                this.log('moveTo','Currently on: '+ this.current+'\nTransition start to: '+ index);
                this.moving = true;
                this.el.classList.add('moving');
                this.syncCssValue('--item-active', 'current', index);

                if (this.transition == 'fade') {
                    for(var item of this.items)
                        item.classList.remove('active');
                    this.items[index].classList.add('active');
                }
            } else {
                this.log('moveTo - Already on: '+ this.current, 'Not moving');
            }
            return this;
        }

        setTransitions(){
            let slider = this;
            switch(this.transition) {
                case 'none':
                case 'translate':
                    this.wrapper.addEventListener('transitionend', Slider.handlerTransition__translate);
                break;
                case 'fade':
                    slider.items[slider.current].classList.add('active');
                    for(let item of this.items){
                        item.addEventListener('transitionend', Slider.handlerTransition__fade);
                    }
                break;
            }
            return this;
        }


        autoTrigger() {
            var slider = this;
            slider.log('autoTrigger') 
            slider.timerAuto = setTimeout(function(){
                if (!slider.loop) {
                    if (slider.direction == 'next' && slider.current == slider.items.length - slider.itemsPerRow)
                        slider.direction = 'prev';
                    if (slider.direction == 'prev' && slider.current == 0)
                        slider.direction = 'next';
                }
                slider[slider.direction]();
            },slider.delay);
            return slider;
        };


        keyEvent(event){
            switch(event.which){
                case 37: // left
                    this.prev(); break;
                case 39: // right
                    this.next(); break;
                case 38: // up
                case 40: // down
                default: return; // exit this handler for other keys
            }
            event.preventDefault();
        };
    }
    return Slider;
}