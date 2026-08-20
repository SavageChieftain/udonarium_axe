<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';

const props = defineProps<{
  /** File name under public/images/screenshots, with or without extension. */
  src: string;
  alt: string;
  caption?: string;
  /** Cap the rendered width in px — portrait shots need it, full-window ones do not. */
  width?: string | number;
}>();

const href = withBase(
  props.src.startsWith('/')
    ? props.src
    : `/images/screenshots/${props.src.includes('.') ? props.src : `${props.src}.webp`}`
);

const style = computed(() => (props.width ? { maxWidth: `${props.width}px` } : undefined));
</script>

<template>
  <figure class="axe-figure" :class="{ 'axe-figure--capped': width }" :style="style">
    <img :src="href" :alt="alt" loading="lazy" decoding="async" />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
