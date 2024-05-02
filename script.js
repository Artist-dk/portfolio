var VanillaTilt = (function () {
    'use strict';
    

    class VanillaTilt {
      constructor(element, settings = {}) {
        if (!(element instanceof Node)) {
          throw ("Can't initialize VanillaTilt because " + element + " is not a Node.");
        }
    
        this.width = null;
        this.height = null;
        this.clientWidth = null;
        this.clientHeight = null;
        this.left = null;
        this.top = null;
    
        this.gammazero = null;
        this.betazero = null;
        this.lastgammazero = null;
        this.lastbetazero = null;
    
        this.transitionTimeout = null;
        this.updateCall = null;
        this.event = null;
    
        this.updateBind = this.update.bind(this);
        this.resetBind = this.reset.bind(this);
    
        this.element = element;
        this.settings = this.extendSettings(settings);
    
        this.reverse = this.settings.reverse ? -1 : 1;
        this.resetToStart = VanillaTilt.isSettingTrue(this.settings["reset-to-start"]);
        this.glare = VanillaTilt.isSettingTrue(this.settings.glare);
        this.glarePrerender = VanillaTilt.isSettingTrue(this.settings["glare-prerender"]);
        this.fullPageListening = VanillaTilt.isSettingTrue(this.settings["full-page-listening"]);
        this.gyroscope = VanillaTilt.isSettingTrue(this.settings.gyroscope);
        this.gyroscopeSamples = this.settings.gyroscopeSamples;
    
        this.elementListener = this.getElementListener();
    
        if (this.glare) {
          this.prepareGlare();
        }
    
        if (this.fullPageListening) {
          this.updateClientSize();
        }
    
        this.addEventListeners();
        this.reset();
    
        if (this.resetToStart === false) {
          this.settings.startX = 0;
          this.settings.startY = 0;
        }
      }
    
      static isSettingTrue(setting) {
        return setting === "" || setting === true || setting === 1;
      }
    
      /**
       * Method returns element what will be listen mouse events
       * @return {Node}
       */
      getElementListener() {
        if (this.fullPageListening) {
          return window.document;
        }
    
        if (typeof this.settings["mouse-event-element"] === "string") {
          const mouseEventElement = document.querySelector(this.settings["mouse-event-element"]);
    
          if (mouseEventElement) {
            return mouseEventElement;
          }
        }
    
        if (this.settings["mouse-event-element"] instanceof Node) {
          return this.settings["mouse-event-element"];
        }
    
        return this.element;
      }
    
      /**
       * Method set listen methods for this.elementListener
       * @return {Node}
       */
      addEventListeners() {
        this.onMouseEnterBind = this.onMouseEnter.bind(this);
        this.onMouseMoveBind = this.onMouseMove.bind(this);
        this.onMouseLeaveBind = this.onMouseLeave.bind(this);
        this.onWindowResizeBind = this.onWindowResize.bind(this);
        this.onDeviceOrientationBind = this.onDeviceOrientation.bind(this);
    
        this.elementListener.addEventListener("mouseenter", this.onMouseEnterBind);
        this.elementListener.addEventListener("mouseleave", this.onMouseLeaveBind);
        this.elementListener.addEventListener("mousemove", this.onMouseMoveBind);
    
        if (this.glare || this.fullPageListening) {
          window.addEventListener("resize", this.onWindowResizeBind);
        }
    
        if (this.gyroscope) {
          window.addEventListener("deviceorientation", this.onDeviceOrientationBind);
        }
      }
    
      removeEventListeners() {
        this.elementListener.removeEventListener("mouseenter", this.onMouseEnterBind);
        this.elementListener.removeEventListener("mouseleave", this.onMouseLeaveBind);
        this.elementListener.removeEventListener("mousemove", this.onMouseMoveBind);
    
        if (this.gyroscope) {
          window.removeEventListener("deviceorientation", this.onDeviceOrientationBind);
        }
    
        if (this.glare || this.fullPageListening) {
          window.removeEventListener("resize", this.onWindowResizeBind);
        }
      }
    
      destroy() {
        clearTimeout(this.transitionTimeout);
        if (this.updateCall !== null) {
          cancelAnimationFrame(this.updateCall);
        }
    
        this.element.style.willChange = "";
        this.element.style.transition = "";
        this.element.style.transform = "";
        this.resetGlare();
    
        this.removeEventListeners();
        this.element.vanillaTilt = null;
        delete this.element.vanillaTilt;
    
        this.element = null;
      }
    
      onDeviceOrientation(event) {
        if (event.gamma === null || event.beta === null) {
          return;
        }
    
        this.updateElementPosition();
    
        if (this.gyroscopeSamples > 0) {
          this.lastgammazero = this.gammazero;
          this.lastbetazero = this.betazero;
    
          if (this.gammazero === null) {
            this.gammazero = event.gamma;
            this.betazero = event.beta;
          } else {
            this.gammazero = (event.gamma + this.lastgammazero) / 2;
            this.betazero = (event.beta + this.lastbetazero) / 2;
          }
    
          this.gyroscopeSamples -= 1;
        }
    
        const totalAngleX = this.settings.gyroscopeMaxAngleX - this.settings.gyroscopeMinAngleX;
        const totalAngleY = this.settings.gyroscopeMaxAngleY - this.settings.gyroscopeMinAngleY;
    
        const degreesPerPixelX = totalAngleX / this.width;
        const degreesPerPixelY = totalAngleY / this.height;
    
        const angleX = event.gamma - (this.settings.gyroscopeMinAngleX + this.gammazero);
        const angleY = event.beta - (this.settings.gyroscopeMinAngleY + this.betazero);
    
        const posX = angleX / degreesPerPixelX;
        const posY = angleY / degreesPerPixelY;
    
        if (this.updateCall !== null) {
          cancelAnimationFrame(this.updateCall);
        }
    
        this.event = {
          clientX: posX + this.left,
          clientY: posY + this.top,
        };
    
        this.updateCall = requestAnimationFrame(this.updateBind);
      }
    
      onMouseEnter() {
        this.updateElementPosition();
        this.element.style.willChange = "transform";
        this.setTransition();
      }
    
      onMouseMove(event) {
        if (this.updateCall !== null) {
          cancelAnimationFrame(this.updateCall);
        }
    
        this.event = event;
        this.updateCall = requestAnimationFrame(this.updateBind);
      }
    
      onMouseLeave() {
        this.setTransition();
    
        if (this.settings.reset) {
          requestAnimationFrame(this.resetBind);
        }
      }
    
      reset() {
        this.onMouseEnter();
    
        if (this.fullPageListening) {
          this.event = {
            clientX: (this.settings.startX + this.settings.max) / (2 * this.settings.max) * this.clientWidth,
            clientY: (this.settings.startY + this.settings.max) / (2 * this.settings.max) * this.clientHeight
          };
        } else {
          this.event = {
            clientX: this.left + ((this.settings.startX + this.settings.max) / (2 * this.settings.max) * this.width),
            clientY: this.top + ((this.settings.startY + this.settings.max) / (2 * this.settings.max) * this.height)
          };
        }
    
        let backupScale = this.settings.scale;
        this.settings.scale = 1;
        this.update();
        this.settings.scale = backupScale;
        this.resetGlare();
      }
    
      resetGlare() {
        if (this.glare) {
          this.glareElement.style.transform = "rotate(180deg) translate(-50%, -50%)";
          this.glareElement.style.opacity = "0";
        }
      }
    
      getValues() {
        let x, y;
    
        if (this.fullPageListening) {
          x = this.event.clientX / this.clientWidth;
          y = this.event.clientY / this.clientHeight;
        } else {
          x = (this.event.clientX - this.left) / this.width;
          y = (this.event.clientY - this.top) / this.height;
        }
    
        x = Math.min(Math.max(x, 0), 1);
        y = Math.min(Math.max(y, 0), 1);
    
        let tiltX = (this.reverse * (this.settings.max - x * this.settings.max * 2)).toFixed(2);
        let tiltY = (this.reverse * (y * this.settings.max * 2 - this.settings.max)).toFixed(2);
        let angle = Math.atan2(this.event.clientX - (this.left + this.width / 2), -(this.event.clientY - (this.top + this.height / 2))) * (180 / Math.PI);
    
        return {
          tiltX: tiltX,
          tiltY: tiltY,
          percentageX: x * 100,
          percentageY: y * 100,
          angle: angle
        };
      }
    
      updateElementPosition() {
        let rect = this.element.getBoundingClientRect();
    
        this.width = this.element.offsetWidth;
        this.height = this.element.offsetHeight;
        this.left = rect.left;
        this.top = rect.top;
      }
    
      update() {
        let values = this.getValues();
    
        this.element.style.transform = "perspective(" + this.settings.perspective + "px) " +
          "rotateX(" + (this.settings.axis === "x" ? 0 : values.tiltY) + "deg) " +
          "rotateY(" + (this.settings.axis === "y" ? 0 : values.tiltX) + "deg) " +
          "scale3d(" + this.settings.scale + ", " + this.settings.scale + ", " + this.settings.scale + ")";
    
        if (this.glare) {
          this.glareElement.style.transform = `rotate(${values.angle}deg) translate(-50%, -50%)`;
          this.glareElement.style.opacity = `${values.percentageY * this.settings["max-glare"] / 100}`;
        }
    
        this.element.dispatchEvent(new CustomEvent("tiltChange", {
          "detail": values
        }));
    
        this.updateCall = null;
      }
    

      prepareGlare() {
        if (!this.glarePrerender) {
          const jsTiltGlare = document.createElement("div");
          jsTiltGlare.classList.add("js-tilt-glare");
    
          const jsTiltGlareInner = document.createElement("div");
          jsTiltGlareInner.classList.add("js-tilt-glare-inner");
    
          jsTiltGlare.appendChild(jsTiltGlareInner);
          this.element.appendChild(jsTiltGlare);
        }
    
        this.glareElementWrapper = this.element.querySelector(".js-tilt-glare");
        this.glareElement = this.element.querySelector(".js-tilt-glare-inner");
    
        if (this.glarePrerender) {
          return;
        }
    
        Object.assign(this.glareElementWrapper.style, {
          "position": "absolute",
          "top": "0",
          "left": "0",
          "width": "100%",
          "height": "100%",
          "overflow": "hidden",
          "pointer-events": "none",
          "border-radius": "inherit"
        });
    
        Object.assign(this.glareElement.style, {
          "position": "absolute",
          "top": "50%",
          "left": "50%",
          "pointer-events": "none",
          "background-image": `linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)`,
          "transform": "rotate(180deg) translate(-50%, -50%)",
          "transform-origin": "0% 0%",
          "opacity": "0"
        });
    
        this.updateGlareSize();
      }
    
      updateGlareSize() {
        if (this.glare) {
          const glareSize = (this.element.offsetWidth > this.element.offsetHeight ? this.element.offsetWidth : this.element.offsetHeight) * 2;
    
          Object.assign(this.glareElement.style, {
            "width": `${glareSize}px`,
            "height": `${glareSize}px`,
          });
        }
      }
    
      updateClientSize() {
        this.clientWidth = window.innerWidth
          || document.documentElement.clientWidth
          || document.body.clientWidth;
    
        this.clientHeight = window.innerHeight
          || document.documentElement.clientHeight
          || document.body.clientHeight;
      }
    
      onWindowResize() {
        this.updateGlareSize();
        this.updateClientSize();
      }
    
      setTransition() {
        clearTimeout(this.transitionTimeout);
        this.element.style.transition = this.settings.speed + "ms " + this.settings.easing;
        if (this.glare) this.glareElement.style.transition = `opacity ${this.settings.speed}ms ${this.settings.easing}`;
    
        this.transitionTimeout = setTimeout(() => {
          this.element.style.transition = "";
          if (this.glare) {
            this.glareElement.style.transition = "";
          }
        }, this.settings.speed);
    
      }
    
      /**
       * Method return patched settings of instance
       * @param {boolean} settings.reverse - reverse the tilt direction
       * @param {number} settings.max - max tilt rotation (degrees)
       * @param {startX} settings.startX - the starting tilt on the X axis, in degrees. Default: 0
       * @param {startY} settings.startY - the starting tilt on the Y axis, in degrees. Default: 0
       * @param {number} settings.perspective - Transform perspective, the lower the more extreme the tilt gets
       * @param {string} settings.easing - Easing on enter/exit
       * @param {number} settings.scale - 2 = 200%, 1.5 = 150%, etc..
       * @param {number} settings.speed - Speed of the enter/exit transition
       * @param {boolean} settings.transition - Set a transition on enter/exit
       * @param {string|null} settings.axis - What axis should be enabled. Can be "x" or "y"
       * @param {boolean} settings.glare - if it should have a "glare" effect
       * @param {number} settings.max-glare - the maximum "glare" opacity (1 = 100%, 0.5 = 50%)
       * @param {boolean} settings.glare-prerender - false = VanillaTilt creates the glare elements for you, otherwise
       * @param {boolean} settings.full-page-listening - If true, parallax effect will listen to mouse move events on the whole document, not only the selected element
       * @param {string|object} settings.mouse-event-element - String selector or link to HTML-element what will be listen mouse events
       * @param {boolean} settings.reset - false = If the tilt effect has to be reset on exit
       * @param {boolean} settings.reset-to-start - true = On reset event (mouse leave) will return to initial start angle (if startX or startY is set)
       * @param {gyroscope} settings.gyroscope - Enable tilting by deviceorientation events
       * @param {gyroscopeSensitivity} settings.gyroscopeSensitivity - Between 0 and 1 - The angle at which max tilt position is reached. 1 = 90deg, 0.5 = 45deg, etc..
       * @param {gyroscopeSamples} settings.gyroscopeSamples - How many gyroscope moves to decide the starting position.
       */
      extendSettings(settings) {
        let defaultSettings = {
          reverse: false,
          max: 15,
          startX: 0,
          startY: 0,
          perspective: 1000,
          easing: "cubic-bezier(.03,.98,.52,.99)",
          scale: 1,
          speed: 300,
          transition: true,
          axis: null,
          glare: false,
          "max-glare": 1,
          "glare-prerender": false,
          "full-page-listening": false,
          "mouse-event-element": null,
          reset: true,
          "reset-to-start": true,
          gyroscope: true,
          gyroscopeMinAngleX: -45,
          gyroscopeMaxAngleX: 45,
          gyroscopeMinAngleY: -45,
          gyroscopeMaxAngleY: 45,
          gyroscopeSamples: 10
        };
    
        let newSettings = {};
        for (var property in defaultSettings) {
          if (property in settings) {
            newSettings[property] = settings[property];
          } else if (this.element.hasAttribute("data-tilt-" + property)) {
            let attribute = this.element.getAttribute("data-tilt-" + property);
            try {
              newSettings[property] = JSON.parse(attribute);
            } catch (e) {
              newSettings[property] = attribute;
            }
    
          } else {
            newSettings[property] = defaultSettings[property];
          }
        }
    
        return newSettings;
      }
    
      static init(elements, settings) {
        if (elements instanceof Node) {
          elements = [elements];
        }
    
        if (elements instanceof NodeList) {
          elements = [].slice.call(elements);
        }
    
        if (!(elements instanceof Array)) {
          return;
        }
    
        elements.forEach((element) => {
          if (!("vanillaTilt" in element)) {
            element.vanillaTilt = new VanillaTilt(element, settings);
          }
        });
      }
    }
    
    if (typeof document !== "undefined") {
      /* expose the class to window */
      window.VanillaTilt = VanillaTilt;
    
      /**
       * Auto load
       */
      VanillaTilt.init(document.querySelectorAll("[data-tilt]"));
    }
    
    return VanillaTilt;
    
    }());
    
VanillaTilt.init(document.querySelector(".js-tilt"), {
  max: 105,
  speed: 1000
});

//It also supports NodeList
VanillaTilt.init(document.querySelectorAll(".js-tilt"));



    
var skills = document.getElementById('skills');
var arr = ['MOBILE APPS', 'GAMES', 'WEBAPPS', 'MOTION', 'WEBSITES', 'UX/UI', 'THINGS']
// var i = 0;
// window.onload = function() {
//     console.log(skills)
//     var a = setInterval(() => {
//         skills.innerHTML = arr[i]
//         if(i < arr.length - 1) {
//             i++
//         } else {
//             i = 0;
//         }
//     }, 2000);
    
// }

    
const typedTextSpan = document.querySelector("#skills");
const cursorSpan = document.querySelector(".cursor");

const textArray =  ['MOBILE APPS', 'GAMES', 'WEBAPPS', 'MOTION', 'WEBSITES', 'UX/UI', 'THINGS'];
const typingDelay = 200;
const erasingDelay = 100;
const newTextDelay = 2000; // Delay between current and next text
let textArrayIndex = 0;
let charIndex = 0;

function type() {
  if (charIndex < textArray[textArrayIndex].length) {
    if(!cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
    typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
    charIndex++;
    setTimeout(type, typingDelay);
  } 
  else {
    cursorSpan.classList.remove("typing");
  	setTimeout(erase, newTextDelay);
  }
}

function erase() {
	if (charIndex > 0) {
    if(!cursorSpan.classList.contains("typing")) cursorSpan.classList.add("typing");
    typedTextSpan.textContent = textArray[textArrayIndex].substring(0, charIndex-1);
    charIndex--;
    setTimeout(erase, erasingDelay);
  } 
  else {
    cursorSpan.classList.remove("typing");
    textArrayIndex++;
    if(textArrayIndex>=textArray.length) textArrayIndex=0;
    setTimeout(type, typingDelay + 1100);
  }
}

document.addEventListener("DOMContentLoaded", function() { // On DOM Load initiate the effect
  if(textArray.length) setTimeout(type, newTextDelay + 250);
});

var list = {
  'python':60,
  'javascript':95,
  'java':65,
  'php':20,
  'mysql':95,
  'html':80,
  'css':75,
  'dsa':60,
  'daa':40,
  'reactjs':80,
  'nodejs':40,
  'expressjs': 70,
  'mongodb':20
}
console.log(list)
var a = document.getElementById('pythonProgress');
a.style.width = list.python+'%';

var a = document.getElementById('javascriptProgress');
a.style.width = list.javascript+'%';

var a = document.getElementById('javaProgress');
a.style.width = list.java+'%';

var a = document.getElementById('phpProgress');
a.style.width = list.php+'%';

var a = document.getElementById('mysqlProgress');
a.style.width = list.mysql+'%';

var a = document.getElementById('htmlProgress');
a.style.width = list.html+'%';

var a = document.getElementById('cssProgress');
a.style.width = list.css+'%';

var a = document.getElementById('dsaProgress');
a.style.width = list.dsa+'%';

var a = document.getElementById('daaProgress');
a.style.width = list.daa+'%'

var a = document.getElementById('reactjsProgress');
a.style.width = list.reactjs+'%';

var a = document.getElementById('expressjsProgress');
a.style.width = list.expressjs+'%';

var a = document.getElementById('nodejsProgress');
a.style.width = list.nodejs+'%';

var a = document.getElementById('mongodbProgress');
a.style.width = list.mongodb+'%';

var cursorD = document.querySelector(".cursor-dot");
var cursorO = document.querySelector('.cursor-outline');

var a = document.getElementsByTagName('a');
// document.addEventListener("mousemove", function(e) {
//   cursorD.style.cssText = cursorO.style.cssText = "left:  "+ e.clientX + 'px; top: '+ e.clientY+'px;';
//   Object.assign(cursorD.style, {
//     "background": "red",
//     "width": "10px",
//     "height": "10px",
//   });
//   Object.assign(cursorO.style, {
//     "border": "solid 2px red",
//     "width": "50px",
//     "height": "50px",
//   });
//   for (let i = 0; i < a.length; i++) {
//     a[i].addEventListener('mouseenter', (e) => {
//       console.log('aCursor')
//       console.log(e.currentTarget)
//       a[i].style.backgroundColor = 'lime'
//       Object.assign(cursorO.style, {
//         "border": "solid 2px red",
//         "width": "100px !important",
//         "height": "100px",
//       });
      
//     })
//     a[i].addEventListener('mouseout', function() {
//       a[i].style.backgroundColor = 'transparent'
      
//       Object.assign(cursorO.style, {
//         "border": "solid 2px red",
//         "width": "50px",
//         "height": "50px",
//       });
//     })
//   }
// });


(function () {

  const link = document.querySelectorAll('a');
  const cursor =  document.querySelector(".cursor-dot");

  Object.assign(cursorD.style, {
    'pointer-events': 'none',
    'position': 'fixed',
    'padding': '0.3rem',
    'background-color': '#fff',
    'border-radius': '50%',
    'mix-blend-mode': 'difference',
    'transition': 'transform 0.3s ease',
    "width": "5px",
    "height": "5px"
  });
  
  Object.assign(cursorO.style, {
    "border": "solid 2px #fff",
    "width": "30px",
    "height": "30px",
    'transition': 'transform 0.3s ease',
    "transition": "50ms",
    "transition-duration": '50ms',
    "opacity": ".5"
  });

const animateitA = function (e) {
      // const span = this.querySelector('span');
      const { offsetX: x, offsetY: y } = e,
      { offsetWidth: width, offsetHeight: height } = this,

      move = 25,
      xMove = x / width * (move * 2) - move,
      yMove = y / height * (move * 2) - move;
      Object.assign(cursorD.style, {
        'pointer-events': 'none',
        'position': 'fixed',
        'padding': '0.3rem',
        'background-color': '#fff',
        'border-radius': '50%',
        'mix-blend-mode': 'difference',
        'transition': 'transform 0.3s ease',
        "width": "25px",
        "height": "25px"
      });
      
      Object.assign(cursorO.style, {
        "border": "solid 4px #fff",
        "width": "80px",
        "height": "80px",
        'transition': 'transform 0.3s ease',
        "transition": "50ms",
        "transition-duration": '50ms',
        "transition": "20ms",
        "transition-duration": '20ms',
        "opacity": ".5"
      });
      // span.style.transform = `translate(${xMove}px, ${yMove}px)`;

      // if (e.type === 'mouseleave') span.style.transform = '';
};

const animateitB = function (e) {

      // const span = this.querySelector('span');
      const { offsetX: x, offsetY: y } = e,
      { offsetWidth: width, offsetHeight: height } = this,

      move = 25,
      xMove = x / width * (move * 2) - move,
      yMove = y / height * (move * 2) - move;
      Object.assign(cursorD.style, {
        'pointer-events': 'none',
        'position': 'fixed',
        'padding': '0.3rem',
        'background-color': '#fff',
        'border-radius': '50%',
        'mix-blend-mode': 'difference',
        'transition': 'transform 0.3s ease',
        "width": "5px",
        "height": "5px"
      });
      
      Object.assign(cursorO.style, {
        "border": "solid 2px #fff",
        "width": "30px",
        "height": "30px",
        'transition': 'transform 0.3s ease',
        "transition": "50ms",
        "transition-duration": '50ms',
        "opacity": ".5"
      });
      // span.style.transform = `translate(${xMove}px, ${yMove}px)`;

      // if (e.type === 'mouseleave') span.style.transform = '';
};

  const editCursor = e => {
    // cursorD.style.cssText = cursorO.style.cssText = "left:  "+ e.clientX + 'px; top: '+ e.clientY+'px;';                                                                                                                                             
        const { clientX: x, clientY: y } = e;
        cursorD.style.left = x + 'px';
        cursorO.style.left = x + 'px';
        cursorD.style.top = y + 'px';
        cursorO.style.top = y + 'px';
        
  };

  link.forEach(b => b.addEventListener('mousemove', animateitA));
  link.forEach(b => b.addEventListener('mouseleave', animateitB));
  window.addEventListener('mousemove', editCursor);

})();













// ----------------------------------


let tp;
window.onload = function() {
  setdataa();
  setTimeout(setform, 1000);
}
let form = document.forms[0];
function submitform(e) {
  e.preventDefault();
  var dt = new FormData(form)
  console.log(dt)
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8081/submit', true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  dt = Array.from(dt.keys()).reduce((r, k) => {
    r[k] = dt.get(k);
    return r;
  }, {});
  dt = JSON.stringify(dt);
  x.onload = function() {
    console.log(this.responseText);
    if(this.responseText != 'err') {
    }
  }
  x.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  x.send('data='+dt);
}
/*name*//*phone*//*email*//*username*//*password*/
class Validation {
  constructor(a) {
    this.re = [/^[a-zA-Z]+$/,/^\d{10}$/,/^[\w - \ .]+@([\w-]+\.)+[\w-]{2,4}$/,/^[A-Za-z0-9_]{5,20}$/,/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/];
    this.el = a;
    if(!(this.el.type==='submit')){
      if(a.dataset.a) this.da = parseInt(this.el.dataset.a);
      if(a.dataset.b) this.db = parseInt(this.el.dataset.b);
      this.ec = this.el.parentElement.querySelector('span');
      this.r = this.el.parentElement.querySelector('.error-msg');
      this.el.addEventListener('focus',()=>this.input());
      this.el.addEventListener('input',()=>this.input());
      this.el.addEventListener('blur',()=>this.input());
    }
  }
  input() { 
    if(parseInt(this.da)===4&&!(parseInt(this.db)===0))tp=this.el.value.trim();
    if(this.el.value.trim() === '') {
      this.ec.classList.add('err');
      this.r.innerHTML = this.el.required?'Required':'';
      this.ec.innerHTML = this.el.dataset.name;
      return false;
    } else if((parseInt(this.el.dataset.a)===4&&parseInt(this.el.dataset.b)===0)?!(this.el.value===tp):!this.re[this.da].test(this.el.value)) {
      this.ec.classList.add('err')
      this.ec.innerHTML = this.el.dataset.msg;
      if(parseInt(this.el.dataset.a)===4&&parseInt(this.el.dataset.b)===0) {
        if(this.el.value===tp) {
          this.ec.classList.remove('err');
        }
      }
      return false;
    } else {
      this.ec.classList.remove('err');
      this.r.innerHTML = '';
      this.ec.innerHTML = this.el.dataset.name;
      return true;
    }
  }
}
function setform() {
  for(var i=0;i<document.forms.length;i++) {
    if(document.forms[i].dataset.validation) {
      var j=0;
      for(j=0;j<document.forms[i].elements.length;j++) {
        new Validation(document.forms[i].elements[j])
      }
    }
  }
}








// function setdataa() {
//   var form = document.forms[0];
//   form.elements["firstname"].value = 'digambar';
// //   form.elements["middleName"].value = 'chandrakant';
//   form.elements["lastname"].value = 'kumbhar';
//   form.elements["phoneno"].value = '9970036430';
//   form.elements["emailid"].value = 'digambarckumbhar299@gmail.com';
//   form.elements["message"].value = 'sketcher';
// }
// // window.onload = setdatab();
// // function setdatab() {
// //   var form = document.forms[0];
// //   form.elements["firstName"].value = 'sdfa3';
// //   form.elements["middleName"].value = 'adfe3';
// //   form.elements["lastName"].value = 'adf3';
// //   form.elements["username"].value = 'sketcher';
// //   form.elements["phone"].value = 'se33';
// //   form.elements["email"].value = 'digambarckumbd'
// //   form.elements["password"].value = 'Pass1234';
// //   form.elements["confirmPassword"].value = 'Pass@1234';
// // }
