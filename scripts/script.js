$(document).on("ready",configurarApp);

function configurarApp () 
{
	var canvas = document.getElementById("miCanvas");
	var ctx = canvas.getContext("2d");
	canvas.width = screen.availWidth;
	dibujaFooter(canvas,ctx)
}
function dibujaFooter(canvas,contexto)
{
	contexto.fillStyle = "rgba(0,0,0,0.8)";
	contexto.moveTo(100,20);
	contexto.quadraticCurveTo(80,-90,canvas.width -250,canvas.height -25)
	contexto.fill();
	//quadraticCurveTo(cpx,cpy,x,y);
}

$(window).load(function() {
  $('.flexslider').flexslider({
    animation: "slide"
  });
});