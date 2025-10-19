// assets/js/main.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Get Data from Jekyll ---
    const jekyllDataScript = document.getElementById('jekyll-data');
    const JDATA = JSON.parse(jekyllDataScript.innerHTML);
    const RATES = JDATA.rates;
    const BOOKED_DATES = new Set(JDATA.booked_dates); // Use a Set for fast lookups

    // --- Mobile Menu ---
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // --- Active Nav on Scroll ---
    const sections = document.querySelectorAll('section');
    const navLi = document.querySelectorAll('.nav-links li a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLi.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === `#${current}`) {
                a.classList.add('active');
            }
        });
    });

    // --- Gallery Modal ---
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    let currentImageIndex = 0;

    const galleryImages = Array.from(galleryItems).map(item => item.dataset.img);

    function openModal(index) {
        currentImageIndex = index;
        modalImg.src = galleryImages[currentImageIndex];
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function showNextImage() {
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        modalImg.src = galleryImages[currentImageIndex];
    }

    function showPrevImage() {
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        modalImg.src = galleryImages[currentImageIndex];
    }

    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => openModal(index));
    });

    closeModalBtn.addEventListener('click', closeModal);
    nextBtn.addEventListener('click', showNextImage);
    prevBtn.addEventListener('click', showPrevImage);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // --- Calendar & Booking ---
    let checkInDate = null;
    let checkOutDate = null;
    const checkinMonthYear = document.getElementById('checkin-month-year');
    const checkinDays = document.getElementById('checkin-days');
    const checkoutMonthYear = document.getElementById('checkout-month-year');
    const checkoutDays = document.getElementById('checkout-days');

    let today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let checkinCurrentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let checkoutCurrentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    function renderCalendar(monthDate, daysGrid, monthYearEl) {
        daysGrid.innerHTML = '';
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();
        monthYearEl.textContent = `${monthDate.toLocaleString('default', { month: 'long' })} ${year}`;
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            daysGrid.appendChild(document.createElement('div')).classList.add('day', 'empty');
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day');
            dayEl.textContent = i;
            
            const date = new Date(year, month, i);
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            dayEl.dataset.date = date.toISOString();

            if (date < today || BOOKED_DATES.has(dateString)) {
                dayEl.classList.add('unavailable');
            } else {
                dayEl.addEventListener('click', () => selectDate(date));
            }

            if (date.getTime() === today.getTime()) dayEl.classList.add('today');

            daysGrid.appendChild(dayEl);
        }
        updateDayClasses();
    }
    
    function selectDate(date) {
        if (!checkInDate || (checkInDate && checkOutDate)) {
            // Start new selection
            checkInDate = date;
            checkOutDate = null;
        } else if (date.getTime() === checkInDate.getTime()) {
            // Deselect check-in
            checkInDate = null;
        } else if (date > checkInDate) {
            // Select check-out
            if (isRangeConflict(checkInDate, date)) {
                alert('Your selection includes unavailable dates. Please choose a different range.');
                return;
            }
            checkOutDate = date;
        } else {
            // Selected date is before check-in, so set as new check-in
            checkInDate = date;
        }
        updateDayClasses();
        updateRateCalculation();
    }

    function isRangeConflict(start, end) {
        let current = new Date(start.getTime());
        current.setDate(current.getDate() + 1); // Start checking from day after check-in
        
        while (current < end) {
            const dateString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            if (BOOKED_DATES.has(dateString)) return true;
            current.setDate(current.getDate() + 1);
        }
        return false;
    }

    function updateDayClasses() {
        document.querySelectorAll('.day:not(.empty)').forEach(dayEl => {
            const date = new Date(dayEl.dataset.date);
            dayEl.classList.remove('selected', 'range');
            
            if (checkInDate && date.getTime() === checkInDate.getTime()) {
                dayEl.classList.add('selected');
            }
            if (checkOutDate && date.getTime() === checkOutDate.getTime()) {
                dayEl.classList.add('selected');
            }
            if (checkInDate && checkOutDate && date > checkInDate && date < checkOutDate) {
                dayEl.classList.add('range');
            }
        });
    }

    function updateRateCalculation() {
        const guests = parseInt(document.getElementById('guest-count').value, 10);
        const durationEl = document.getElementById('trip-duration');
        const baseRateEl = document.getElementById('baseRate');
        const extraGuestFeeEl = document.getElementById('extraGuestFee');
        const cleaningFeeEl = document.getElementById('cleaningFee');
        const totalEl = document.getElementById('total');
        
        if (checkInDate && checkOutDate) {
            const diffTime = Math.abs(checkOutDate - checkInDate);
            const numNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (numNights <= 0) {
                 clearDates();
                 return;
            }

            const baseTotal = numNights * RATES.base_rate;
            const extraGuests = Math.max(0, guests - RATES.max_guests);
            const extraGuestFeeTotal = extraGuests * numNights * RATES.extra_guest_fee;
            const cleaningFee = RATES.cleaning_fee;
            const total = baseTotal + extraGuestFeeTotal + cleaningFee;
            
            durationEl.textContent = `${numNights} night${numNights > 1 ? 's' : ''}`;
            baseRateEl.textContent = baseTotal.toFixed(2);
            extraGuestFeeEl.textContent = extraGuestFeeTotal.toFixed(2);
            cleaningFeeEl.textContent = cleaningFee.toFixed(2);
            totalEl.textContent = total.toFixed(2);
        } else {
            durationEl.textContent = '--';
            baseRateEl.textContent = '0.00';
            extraGuestFeeEl.textContent = '0.00';
            cleaningFeeEl.textContent = '0.00';
            totalEl.textContent = '0.00';
        }
    }
    
    function clearDates() {
        checkInDate = null;
        checkOutDate = null;
        updateDayClasses();
        updateRateCalculation();
    }

    // Initial Render
    renderCalendar(checkinCurrentDate, checkinDays, checkinMonthYear);
    renderCalendar(checkoutCurrentDate, checkoutDays, checkoutMonthYear);

    // Calendar Navigation
    document.getElementById('prev-checkin').addEventListener('click', () => {
        checkinCurrentDate.setMonth(checkinCurrentDate.getMonth() - 1);
        renderCalendar(checkinCurrentDate, checkinDays, checkinMonthYear);
    });
    document.getElementById('next-checkin').addEventListener('click', () => {
        checkinCurrentDate.setMonth(checkinCurrentDate.getMonth() + 1);
        renderCalendar(checkinCurrentDate, checkinDays, checkinMonthYear);
    });
    document.getElementById('prev-checkout').addEventListener('click', () => {
        checkoutCurrentDate.setMonth(checkoutCurrentDate.getMonth() - 1);
        renderCalendar(checkoutCurrentDate, checkoutDays, checkoutMonthYear);
    });
    document.getElementById('next-checkout').addEventListener('click', () => {
        checkoutCurrentDate.setMonth(checkoutCurrentDate.getMonth() + 1);
        renderCalendar(checkoutCurrentDate, checkoutDays, checkoutMonthYear);
    });
    
    // Listen for guest count changes
    document.getElementById('guest-count').addEventListener('change', updateRateCalculation);
    
    // Clear Button
    document.getElementById('clear-dates-btn').addEventListener('click', clearDates);

    // --- Booking Button Alert ---
    document.getElementById('book-now-btn').addEventListener('click', () => {
        if (!checkInDate || !checkOutDate) {
            alert('Please select a check-in and check-out date.');
            return;
        }
        alert('Your stay have been booked');
        // In a real app, you'd send data to a server here
        clearDates();
    });
});
