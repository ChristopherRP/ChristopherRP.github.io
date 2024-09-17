document.addEventListener('DOMContentLoaded', function() {
    // Obtiene la fecha actual
    var today = new Date();
    var year = today.getFullYear();
    var month = ('0' + (today.getMonth() + 1)).slice(-2); // Mes en formato 2 dígitos
    var day = ('0' + today.getDate()).slice(-2); // Día en formato 2 dígitos
    
    // Construye el formato de fecha YYYY-MM-DD
    var currentDate = year + '-' + month + '-' + day;
    
    // Establece el valor del input de fecha
    document.getElementById('fecha').value = currentDate;
});

function validarCheckbox() {
    // Obtener el elemento checkbox
    const checkbox = document.getElementById('casa');
    const checkbox2 = document.getElementById('depa');
    

        
    // Obtener el campo de texto donde se mostrará el mensaje
    const mensajeInput = document.getElementById('ValorAquiler');
    
    

    // Verificar si el checkbox está seleccionado o no
    if (checkbox.checked) {

        mensajeInput.value = '100000'; // Mostrar mensaje en el campo de texto
        
        
    }  // Verificar si el checkbox está seleccionado o no
    else if (checkbox2.checked) {
        mensajeInput.value = +'80000'; // Mostrar mensaje en el campo de texto
    } 

    else
    {
        mensajeInput.value = ''; // Limpiar el campo de texto si no está seleccionado
    }
}

function validacioDatos()
{
    const checkbox = document.getElementById('casa');
    const checkbox2 = document.getElementById('depa');
    
    if(checkbox.checked && checkbox2.checked)
        {
            alert("no puedo hacer el calculo porque tiene marcado las 2 opciones (casa y departamento)")
            mensajeInput.value = ''; // Limpiar el campo de texto si no está seleccionado

            checkbox.checked=false;
            checkbox2.checked=false;

        }
}


function validarCheckboxCalcularTotal() {

    validacioDatos();

    // Obtener el elemento checkbox
    const checkbox = document.getElementById('Calcular');
    var ValorAquiler = document.getElementById('ValorAquiler').value;
    var MontoAlquilino=document.getElementById('MontoAlquilino').value;
    

        
    // Obtener el campo de texto donde se mostrará el mensaje
    const mensajeInput = document.getElementById('inputTotal');
    
    var total=MontoAlquilino-ValorAquiler;

    // Verificar si el checkbox está seleccionado o no
    if (checkbox.checked) {

        mensajeInput.value = "₡"+total; // Mostrar mensaje en el campo de texto
        alert("El valor de diferencia es de: ₡"+total);
        
        
    } 
}




function imprimirPagina()
{
    window.print();
}
