// Smooth scrolling to registration section
function scrollToRegistration() {
    document.getElementById('registration').scrollIntoView({
        behavior: 'smooth'
    });
}

// Handle form submission
function handleRegistration(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        interests: formData.get('interests'),
        newsletter: formData.get('newsletter') === 'on'
    };
    
    // Simple validation
    if (!data.name || !data.email || !data.interests) {
        alert('Per favore compila tutti i campi obbligatori.');
        return;
    }
    
    // Simulate form submission
    console.log('Dati registrazione:', data);
    
    // Show success message
    alert('Grazie per esserti unito alla community GreenSpark! Ti contatteremo presto.');
    
    // Reset form
    event.target.reset();
}

// Add some interactivity to cards
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to benefit cards
    const benefitCards = document.querySelectorAll('.benefit-card');
    benefitCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add hover effects to support cards
    const supportCards = document.querySelectorAll('.support-card');
    supportCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Simple parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-section');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
});