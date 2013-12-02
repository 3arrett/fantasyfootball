/*********************************************************************
  #### Twitter Post Fetcher v6.0 ####
  Coded by Jason Mayes 2013. A present to all the developers out there.
  www.jasonmayes.com
  Please keep this disclaimer with my code if you use it. Thanks. :-)
  Got feedback or questions, ask here: 
  http://www.jasonmayes.com/projects/twitterApi/
  Updates will be posted to this site.
*********************************************************************/
var twitterFetcher=function(){function q(d){return d.replace(/<b[^>]*>(.*?)<\/b>/gi,function(c,d){return d}).replace(/class=".*?"|data-query-source=".*?"|dir=".*?"|rel=".*?"/gi,"")}var r="",l=20,m=!0,g=[],n=!1,j=!0,k=!0,p=null;return{fetch:function(d,c,f,e,h,b,a){void 0===f&&(f=20);void 0===e&&(m=!0);void 0===h&&(h=!0);void 0===b&&(b=!0);void 0===a&&(a="default");n?g.push({id:d,domId:c,maxTweets:f,enableLinks:e,showUser:h,showTime:b,dateFunction:a}):(n=!0,r=c,l=f,m=e,k=h,j=b,p=a,c=document.createElement("script"),
c.type="text/javascript",c.src="//cdn.syndication.twimg.com/widgets/timelines/"+d+"?&lang=en&callback=twitterFetcher.callback&suppress_response_codes=true&rnd="+Math.random(),document.getElementsByTagName("head")[0].appendChild(c))},callback:function(d){var c=document.createElement("div");c.innerHTML=d.body;d=c.getElementsByClassName("e-entry-title");for(var f=c.getElementsByClassName("p-author"),e=c.getElementsByClassName("dt-updated"),c=[],h=d.length,b=0;b<h;){if("string"!==typeof p){var a=new Date(e[b].getAttribute("datetime").replace(/-/g,
"/").replace("T"," ").split("+")[0]),a=p(a);e[b].setAttribute("aria-label",a);d[b].innerText?e[b].innerText=a:e[b].textContent=a}m?(a="",k&&(a+='<div class="user">'+q(f[b].innerHTML)+"</div>"),a+='<p class="tweet">'+q(d[b].innerHTML)+"</p>",j&&(a+='<p class="timePosted">'+e[b].getAttribute("aria-label")+"</p>")):d[b].innerText?(a="",k&&(a+='<p class="user">'+f[b].innerText+"</p>"),a+='<p class="tweet">'+d[b].innerText+"</p>",j&&(a+='<p class="timePosted">'+e[b].innerText+"</p>")):(a="",k&&(a+='<p class="user">'+
f[b].textContent+"</p>"),a+='<p class="tweet">'+d[b].textContent+"</p>",j&&(a+='<p class="timePosted">'+e[b].textContent+"</p>"));c.push(a);b++}c.length>l&&c.splice(l);d=c.length;f=0;e=document.getElementById(r);for(h="<ul>";f<d;)h+="<li>"+c[f]+"</li>",f++;e.innerHTML=h+"</ul>";n=!1;0<g.length&&(twitterFetcher.fetch(g[0].id,g[0].domId,g[0].maxTweets,g[0].enableLinks,g[0].showUser,g[0].showTime,g[0].dateFunction),g.splice(0,1))}}}();

twitterFetcher.fetch('303527456558682112', 'tweet', 10, true, false, true);