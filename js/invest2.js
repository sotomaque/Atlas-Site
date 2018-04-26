"use strict";function isBlank(str){return!str||/^\s*$/.test(str)}function isEmail(str){return/\S+@\S+\.\S+/.test(str)}var $=window.$,ga=window.ga;$(function(){var $container=$("div.teaser"),$form=$("form#invest-form"),$email=$("input#email",$form),csrfToken=$("#csrfToken").val();$form.on("submit",function(e){var hasError=!1;e.preventDefault(),!isBlank($email.val())&&isEmail($email.val())||(hasError=!0,$email.addClass("error")),hasError||($container.addClass("success"),$.ajax({type:"POST",url:window.location.pathname,data:JSON.stringify({email:$email.val()}),headers:{"x-csrf-token":csrfToken},contentType:"application/json",dataType:"json"}),ga&&ga("send",{hitType:"event",eventCategory:"Waitlist",eventAction:"enroll",eventLabel:"US Waitlist"}))}),$("input",$form).on("focus",function(){$(this).removeClass("error")})}),function(){function animate(elem){elem.classList.add("animate","visible")}function listener(event){switch(event.type){case"animationstart":break;case"animationend":"block-expand"===event.animationName?(event.target.classList.remove("animate"),event.target.classList.add("switch"),$(event.target).prev(".block-revealer__content").css("opacity",1)):"block-collapse"===event.animationName&&event.target.classList.remove("visible","switch")}}for(var revealEl=document.getElementsByClassName("reveal"),fadeEl=document.getElementsByClassName("fade"),animateEl=document.getElementsByClassName("block-revealer__element"),i=0;i<animateEl.length;i++)$(animateEl[i]).css({backgroundColor:"#06B07D"}),animateEl[i].addEventListener("animationstart",listener,!1),animateEl[i].addEventListener("animationend",listener,!1),setTimeout(animate,250,animateEl[0]),setTimeout(animate,1100,animateEl[1]);setTimeout(animate,800,revealEl[0]),setTimeout(animate,1850,fadeEl[0]),setTimeout(animate,2e3,fadeEl[1])}(),function(){var $window=$(window),stickyEl=$("#sticky"),stickyElHeight=$("#sticky").outerHeight(),headerHeight=$(".vest-header").outerHeight()-stickyElHeight,handleScroll=function(){stickyEl.toggleClass("stuck",$window.scrollTop()>=headerHeight)},handleResize=function(){headerHeight=$(".vest-header").outerHeight()-stickyElHeight,handleScroll()};$window.on("scroll",handleScroll),$window.on("resize",handleResize),handleResize()}();