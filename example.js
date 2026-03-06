const activeItems = [
  {
    name: 'Scout Drones',
    allowedCrystals: ['Amulet Crystal'],
  },
  {
    name: 'Bio Spinal Enhancer',
    allowedCrystals: [
      'Perfect Green Crystal',
      'Perfect Pink Crystal',
      'Perfect Orange Crystal',
      'Perfect Yellow Crystal',
    ],
  },
  {
    name: 'Rift Gun',
    allowedCrystals: ['Amulet Crystal'],
  },
];

const restrictions = [
  {
    name: 'Amulet Crystal',
    allowedItems: ['Rift Gun', 'Scout Drones'],
    blacklist: ['Bio Spinal Enhancer'],
  },
  {
    name: 'Perfect Green Crystal',
    allowedItems: ['Bio Spinal Enhancer'],
    blacklist: ['Rift Gun', 'Scout Drones'],
  },
];
