<template>
    <div class="zoom-overlay" @click.self="handleOverlayClick">
        <div class="zoom-modal">
            <button class="zoom-close-btn" @click="$emit('close')">&times;</button>
            
            <p class="holo-hint">
                ✨ Maintiens la souris et bouge pour faire pivoter le foil holographique
            </p>

            <div 
                ref="card3dRef"
                class="card-3d-wrapper"
                :class="{ 'is-dragging': isDragging }"
                :style="card3dStyle"
                @mousedown="startDrag"
            >
                <div class="card__rotator">
                    <!-- Image de la carte One Piece -->
                    <img :src="card.image_url" :alt="card.name" class="zoomed-image" />
                    
                    <!-- Couche 1 : Texture Grain fixe -->
                    <div class="card__grain"></div>

                    <!-- Couche 2 : Effet Sparkles / Rainbow basé sur le CSS du site -->
                    <div class="card__sparkles"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    card: Object,
    isAlternativeCard: Boolean
})

const emit = defineEmits(['close'])

const card3dRef = ref(null)
const isDragging = ref(false)
const wasDragging = ref(false)
const rotateX = ref(0)
const rotateY = ref(0)
const shineX = ref(50)
const shineY = ref(50)

const handleOverlayClick = () => {
    if (!wasDragging.value) emit('close')
    wasDragging.value = false
}

const startDrag = (e) => {
    e.preventDefault()
    isDragging.value = true
    wasDragging.value = false
    updateTilt(e)

    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
    if (!isDragging.value) return
    wasDragging.value = true
    updateTilt(e)
}

const stopDrag = () => {
    if (!isDragging.value) return
    isDragging.value = false

    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)

    rotateX.value = 0
    rotateY.value = 0
    shineX.value = 50
    shineY.value = 50

    setTimeout(() => { wasDragging.value = false }, 100)
}

const updateTilt = (e) => {
    if (!card3dRef.value) return
    const rect = card3dRef.value.getBoundingClientRect()
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const offsetX = e.clientX - centerX
    const offsetY = e.clientY - centerY

    const maxDegree = 25
    rotateX.value = Math.max(-maxDegree, Math.min(maxDegree, -(offsetY / (rect.height / 2)) * 20))
    rotateY.value = Math.max(-maxDegree, Math.min(maxDegree, (offsetX / (rect.width / 2)) * 20))

    shineX.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    shineY.value = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
}

const card3dStyle = computed(() => {
    return {
        '--hover-tilt-x': `${(shineX.value - 50) * 0.8}`,
        '--hover-tilt-y': `${(shineY.value - 50) * 0.8}`,
        '--pointer-x': `${shineX.value}%`,
        '--pointer-y': `${shineY.value}%`,
        '--hover-tilt-opacity': isDragging.value ? '1' : '0.45',
        transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`
    }
})
</script>

<style scoped>
.zoom-overlay {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.92);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    padding: 20px;
    user-select: none;
}

.zoom-modal {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.zoom-close-btn {
    position: absolute;
    top: -45px;
    right: 0;
    background: none;
    border: none;
    color: #ffffff;
    font-size: 2.5rem;
    cursor: pointer;
}

.holo-hint {
    color: #facc15;
    font-size: 0.85rem;
    margin-bottom: 12px;
    text-align: center;
    font-weight: 600;
}

.card-3d-wrapper {
    position: relative;
    border-radius: 16px;
    cursor: grab;
    transition: transform 0.15s ease-out;
    transform-style: preserve-3d;
    will-change: transform;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
}

.card-3d-wrapper.is-dragging {
    cursor: grabbing;
    transition: none;
}

.card__rotator {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    transform-style: preserve-3d;
}

.zoomed-image {
    max-width: 85vw;
    max-height: 75vh;
    border-radius: 16px;
    display: block;
    object-fit: contain;
    pointer-events: none;
}

/* Texture Grain de fond */
.card__grain {
    position: absolute;
    inset: 0;
    border-radius: 16px;
    pointer-events: none;
    background-image: url("../assets/images/grain.webp");
    background-size: 150px 150px;
    background-position: center;
    opacity: 0.2;
    mix-blend-mode: overlay;
    z-index: 2;
}

/* COUCHE UNIQUE INSPIREE DU CODE POKEMON (Special Illustration Art) */
.card__sparkles {
    position: absolute;
    inset: 0;
    border-radius: 16px;
    pointer-events: none;
    z-index: 3;

    /* Dégradé arc-en-ciel pastel de l'exemple */
    --sparkle-rainbow-gradient: linear-gradient(to top left, #f9b3eb, #e2a6fc, #88a2f8, #a2f5a9 90%);
    
    /* Image de texture (reprise de ton wave.png) */
    --sparkles-image: url("../assets/images/wave.png");
    
    /* Décalage dynamique calculé par le JS pour la parallaxe */
    --sparkles-offset: calc(50% + var(--hover-tilt-x, 0) * 1.5px) calc(50% + var(--hover-tilt-y, 0) * 1.5px);
    
    /* Dégradé de lumière interactif */
    --default-glare-gradient: radial-gradient(
        circle at var(--pointer-x, 50%) var(--pointer-y, 50%),
        rgba(255, 255, 255, 0.8) 0%,
        rgba(255, 255, 255, 0.1) 40%,
        rgba(0, 0, 0, 0.5) 80%
    );

    /* Superposition des 3 images */
    background-image: 
        var(--sparkle-rainbow-gradient),
        var(--sparkles-image),
        var(--default-glare-gradient);

    background-size: cover, 120px 120px, cover;
    background-position: center, var(--sparkles-offset), center;
    background-repeat: no-repeat, repeat, no-repeat;
    
    /* Fusion des couches : color-burn + color-dodge */
    background-blend-mode: color-burn, color-dodge;
    
    mix-blend-mode: color-dodge;
    opacity: calc(var(--hover-tilt-opacity, 0.45) * 0.75);
    will-change: background-image, background-position, opacity;
}
</style>