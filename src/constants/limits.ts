const limits = {
  pricingPolicy: {
    value: {
      min: 0,
      max: 0,
    },
    expiryDate: {
      limit: {
        min: null,
        max: 6,
      },
    },
  },
  course: {
    title: {
      min: 10,
      max: 70,
    },
    requirement: {
      limit: {
        min: null,
        max: 10,
      },
    },
    whatYouWillLearn: {
      limit: {
        min: null,
        max: 10,
      },
    },
    shortDescription: {
      min: 0,
      max: 125,
    },
    description: {
      min: 0,
      max: 1200,
    },
    price: {
      min: 0,
      max: 100000000,
    },
    keyword: {
      limit: {
        min: null,
        max: 10,
      },
      length: {
        min: 0,
        max: 35,
      },
    },
    aboutAuthor: {
      min: 0,
      max: 600,
    },
    section: {
      title: {
        min: 0,
        max: 70,
      },
      description: {
        min: 0,
        max: 200,
      },
    },
    note: {
      title: {
        min: 10,
        max: 70,
      },
      description: {
        min: 0,
        max: 1000,
      },
    },
  },
  user: {
    name: {
      min: 0,
      max: 100,
    },
  },
};
export default limits;
