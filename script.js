let trackingIDElem = document.getElementsByClassName("pt-delivery-card-trackingId")[0];
// TI = Tracking ID, TIGroup since it's the group of elements describing tracking information
let TIGroup = trackingIDElem.parentElement;
TIGroup.children[2].click();
