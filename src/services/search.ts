import models from '@models/index';

const getCourseSuggestions = (search: string, userId: string) =>
  new Promise<{ title: string; _id: string }[]>(async (resolve, reject) => {
    try {
      if(search.toString().trim().length != 0){
        const safeSearch = search.toString().replace(/([!@#$%^&*()+=\[\]\\';,./{}|":<>?~_-])/g, "\\$1");
        const regex = new RegExp(safeSearch.split(' ').join('|'), 'i');

        let topSearchesFromHistory: any[] = [];

        if(userId !== ""){
          topSearchesFromHistory = await models.SearchQuery.aggregate([
            {
              $match: {
                text: { $regex: regex },
                userId: userId,
              },
            },
            {
              $group: {
                _id: '$text',
                count: { $sum: 1 },
              },
            },
            {
              $sort: {
                count: -1,
              },
            },
            {
              $limit: 5,
            },
          ]);
        }

        let topSearches = await models.SearchQuery.aggregate([
          {
            $match: {
              text: { $regex: regex },
            },
          },
          {
            $group: {
              _id: '$text',
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              count: -1,
            },
          },
          {
            $limit: 8 - topSearchesFromHistory.length,
          },
        ]);

        console.log("history", topSearchesFromHistory, userId);
        console.log("global", topSearches);

        topSearchesFromHistory = topSearchesFromHistory.map((item) => ({...item, type: 'history'}))
        topSearches = topSearches.map((item) => {
          if(topSearchesFromHistory.filter((item2) => item2._id == item._id).length == 0)
            return ({...item, type: 'global'});
        })

        resolve(topSearchesFromHistory.concat(topSearches));
      }
      else {
        if(userId !== ""){
          let topSearchesFromHistory = await models.SearchQuery.aggregate([
            {
              $match: {
                userId: userId,
              },
            },
            {
              $group: {
                _id: '$text'
              },
            },
            { 
              $sort: { 
                createdDate: -1 
              } 
            },
            {
              $limit: 5,
            },
          ]);
          topSearchesFromHistory = topSearchesFromHistory.map((item) => ({...item, type: 'history'}))
          console.log("history", topSearchesFromHistory, userId);
          resolve(topSearchesFromHistory);
        }
        else{
          resolve([]);
        }
      }
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const addSearchQueryWithValidation = async (search: string, currentUserId: string) => {
  if(search.toString().trim().length != 0){
    const courses = await models.Course.aggregate([
      {
        $search: {
          autocomplete: {
            query: search.toString(),
            path: 'meta.title',
            fuzzy: {
              maxEdits: 2,
              prefixLength: 3,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
        },
      },
      {
        $project: {
          meta: 1,
          id: 1,
          author: {
            first_name: 1,
            last_name: 1,
          },
        },
      },
      {
        $replaceWith: {
          $mergeObjects: [{ _id: '$_id', author: '$author' }, { title: '$meta.title' }],
        },
      },
    ]);

    if(courses.length != 0){
      models.SearchQuery.create({text: search, userId: currentUserId});
    }
  }
}
export default {
  getCourseSuggestions,
  addSearchQueryWithValidation
};
