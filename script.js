// --------------------------------------------------------------------------------
//
//    Script.js file for Hike Planning website
//
// Currently -2- big function areas in this script.js file; see sections for info.
//
// --------------------------------------------------------------------------------


//===================================================================================

//     Hamburger functionalities (on small screens, nav-bar collapses into hamburger menu)
//     Functionalities include text/references in html and css file.
// 
// (1) When the hamburger is clicked, the nav-menu appears and the hamburger spans turn
// into an X. When a nav-link is clicked, the nav-menu disappears. 
// 
// (2) The hamburger button only appears on smaller screens or windows because on 
// larger screens, the nav-bar and nav-links are already visible across the top. A 
// possible additional function would be to add an eventListener which will adjust
// isSmallScreen to correspond to the width of the window.
// 
// (3) After the user clicks a nav-link (including the nav-branding 'home' link),
// the nav-menu disappears and the hamburger spans return from X to hamburger shape.
// This is completed by removing "active" class from the hamburger and nav-menu.
// Also, clickedLinkPause is set to true for 2 seconds, allowing link-clicking to
// prevent the nav-bar from hiding after scrolling forward to lower sections. See 
// the below nav-bar hiding functionality for further information on that.
// 
// -adopted from https://gist.github.com/Kernix13/2342fd84e3dbf028800710ec68b56e30 and primarily
// https://dev.to/devggaurav/let-s-build-a-responsive-navbar-and-hamburger-menu-using-html-css-and-javascript-4gci

const hamburger = document.querySelector(".hamburger"); // the hamburger is a div 
// that contains the "slices" spans for the hamburger shape (I changed the class name 
// from "bar" to "slice" for clarity and to avoid confusion with the nav-bar)

const navMenu = document.querySelector(".nav-menu"); // the nav-menu is the ul element 
// containing the nav-links

let clickedLinkPause = false; // initialize clickedLinkPause to prevent nav-bar from 
// auto-hiding when user clicks a nav-link (causing window to scroll to that section)


// when hamburger is clicked, add "active" class to hamburger and nav-menu
hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
})

// if anything gets clicked, remove "active" class from hamburger and nav-menu
document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");    
    
    clickedLinkPause = true; 
    // set to true after user clicks nav-link; see below for more on how this works

    setTimeout(() => {
        clickedLinkPause = false; 
    }, 2000); // reset to false after 2 seconds, long enough for the scroll to complete
}))
//===================================================================================


//===================================================================================

//     Nav-Bar hiding functionalities (when the nav-bar shifts up and out of view)
//     Functionalities include text/references in html and css file.
// 
// (1) When user scrolls down, the nav-bar hides. When they scroll up, it shows again. 
// This is to maximize the screen space for content when scrolling down, while still 
// allowing easy access to the nav-bar when scrolling up. 
// 
// (2) The hiding only triggers on smaller screens because on larger screens, the 
// nav-bar doesn't take up much space and it's more important to have it visible for 
// easy navigation. 
// 
// (3) Additionally, if a nav-link has just been clicked, the page will scroll to the
// relevant section. To prevent the nav-bar from auto-hiding during that scroll, and
// for less disruption to user, the clickedLinkPause (from above) remains false for 2 
// seconds after a link is clicked, which is long enough for the scroll to complete.
//
// -adopted from https://www.w3schools.com/howto/howto_js_navbar_hide_scroll.asp

const navBar = document.getElementById("nav-bar"); 

var prevScrollpos = window.pageYOffset || document.documentElement.scrollTop;

window.onscroll = function() {  // simple but only one onscroll listener allowed
//window.addEventListener("scroll", function() { // may be more secure

    var isSmallScreen = ((window.innerWidth * window.innerHeight) < 500000); 
    // 500k seems appropriate to delineate small from large screens

    if (isSmallScreen === true && clickedLinkPause === false) { 
        var currentScrollPos = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScrollPos > prevScrollpos && currentScrollPos > 75 ) { 
            // Downscroll - hide navbar
            if (clickedLinkPause === true) {
                clickedLinkPause = false; 
            } else {
                navBar.classList.add("nav-up"); //console.log("navBar hidden");
            }
        } else {
            // Upscroll - show navbar
            navBar.classList.remove("nav-up"); //console.log("navBar revealed");
        }
        // reset prevScrollpos to 0 if at top of page, or set it to currentScrollPos
        if (currentScrollPos <= 0) {
            prevScrollpos = 0;
        } else { 
            prevScrollpos = currentScrollPos;
        }
    }
} // end of window.onscroll function
//}, false); // end of window.addEventListener function

//------------------------------------------------------------------------------------