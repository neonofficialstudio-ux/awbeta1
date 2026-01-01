
import React from 'react';
import LoadingSkeleton from '../base/LoadingSkeleton';

const PageSkeleton: React.FC = () => {
    return (
        <div className="animate-pulse space-y-8 w-full max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-10">
                 <div className="space-y-3">
                     <LoadingSkeleton width={120} height={16} />
                     <LoadingSkeleton width={300} height={40} />
                 </div>
                 <LoadingSkeleton width={150} height={50} className="rounded-xl" />
            </div>

            {/* Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LoadingSkeleton height={200} className="rounded-2xl" />
                <LoadingSkeleton height={200} className="rounded-2xl" />
                <LoadingSkeleton height={200} className="rounded-2xl" />
            </div>
            
            {/* List Content */}
            <div className="space-y-4 pt-4">
                 <LoadingSkeleton width={200} height={24} />
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <LoadingSkeleton key={i} height={300} className="rounded-2xl" />
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default PageSkeleton;
