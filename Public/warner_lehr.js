document.getElementById('volumetric-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    // Convert inputs to numbers
    const wi = parseFloat(data.wi);
    const qi = parseFloat(data.qi);
    const ti = parseFloat(data.ti);
    const h = parseFloat(data.h);
    const f = parseFloat(data.f);
    const sw = parseFloat(data.sw);
    const d = parseFloat(data.d);

    // Math Logic
    const totalDays = ti * 365.25;
    const totalInjected = wi + (qi * totalDays);

    const denominator = Math.PI * h * f * sw;
    
    if (denominator <= 0) {
        document.getElementById('error').textContent = "Invalid inputs: Denominator is zero or less.";
        document.getElementById('error').hidden = false;
        return;
    }

    const r = Math.sqrt((totalInjected * 5.615) / denominator);
    const rd = r + (2.3 * Math.sqrt(d * r));

    // Display
    document.getElementById('res-r').textContent = r.toLocaleString(undefined, {maximumFractionDigits: 2});
    document.getElementById('res-rd').textContent = rd.toLocaleString(undefined, {maximumFractionDigits: 2});
    document.getElementById('error').hidden = true;
});